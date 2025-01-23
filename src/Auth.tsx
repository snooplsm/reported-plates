// Import Parse minified version
import Parse from 'parse/dist/parse.min.js';
import {jwtDecode, JwtPayload} from "jwt-decode";
import { ComplaintType } from './Complaints';
import { Feature } from './api/ny/nyc/nyc';
import { Subject } from 'rxjs';

const PARSE_APPLICATION_ID = 'jkAZF8ojV4vOGnhSBjdwiMWBKpWML5tM4SWGKgOV';
const PARSE_HOST_URL = 'https://parseapi.back4app.com/';
const PARSE_JAVASCRIPT_KEY = 'LeBKOerWTXGBGRLE0yvg2bXa5RRv4e8PuC6INEFA';
Parse.initialize(PARSE_APPLICATION_ID, PARSE_JAVASCRIPT_KEY);
Parse.serverURL = PARSE_HOST_URL;

export const userLogout = new Subject<boolean>()
export const userLogin = new Subject<User>()

export interface User {
    firstName:string
    lastName:string
    id:string,
    email:string,
    phone?:string
}

export const loginWithPassword = async(email:string, password:string, accessToken:string, jwt:JwtPayload):Promise<User> => {
    try {
        const user = await Parse.User.logIn(email, password)
        return await login({credential:accessToken}, user)
    } catch(e) {
        throw e
    }
}

export interface ReportError {
    errors:ReportError[]
}

export interface ReportErrorConstructor {
    new (errors: ReportErrors[]): ReportError;
    (errors: ReportErrors[]): ReportError;
    readonly prototype: Error;
}

export var ReportError: ReportErrorConstructor;

export enum ReportErrors {
    MISSING_PLATE,
    MISSING_PLATE_STATE,
    NO_PHOTOS,
    MISSING_DATE,
    MISSING_ADDRESS,
    MISSING_COMPLAINT,
    NOT_LOGGED_IN             
  }

export interface Report {
    license: string
    state:string
    files: File[]
    colorTaxi?: string
    timeofreport: Date
    address: Feature
    reportDescription: string
    testify: boolean
    passenger: boolean
    typeofcomplaint: ComplaintType,
    user: User
}



export const submitReport = async (r:Report) => {
    const current = await Parse.User.current()
    if(!current) {
        throw Error("Not Logged In")
    }
    const Submission = Parse.Object.extend("submission")
    const s = new Submission();
    const user = r.user
    const lic = 'TEST'
    s.set('license', lic)
    s.set('state', r.state)
    s.set('medallionNo', lic)
    s.set('Username', current.get('email'))
    s.set('timeofreported', r.timeofreport)
    s.set('timeofreport', r.timeofreport)
    s.set('LastName', user.firstName)
    s.set('FirstName', user.lastName)
    s.set('longitude1', r.address.geometry.coordinates[0])
    s.set('latitude1', r.address.geometry.coordinates[1])
    s.set('latitude', r.address.geometry.coordinates[1].toString())
    s.set('longitude', r.address.geometry.coordinates[0].toString())
    s.set('can_be_shared', true)
    s.set('typeofreport', 'complaint')
    s.set('loc1_address', r.address.properties.label)
    s.set('reportDescription', r.reportDescription)
    s.set('testify', true)
    s.set('operating_system', 'web')
    s.set('Phone', user.phone || current.get('Phone'))
    s.set('Passenger', false)
    s.set('typeofcomplaint', r.typeofcomplaint)
    if(user.phone && user.phone != current.get('Phone')) {
        current.set('Phone', user.phone)
        await current.save()
    }
    let index = 0
    if(r.files.length>2) {
        throw Error("Too Many Files")
    }

    for(const file of r.files) {
        const f = new Parse.File(file.name, file);
        const photo = await f.save()
        s.set(`photoData${index}`, photo)
        index++
    }

    const result = await s.save()
}

export const login = async (response:any, onAlreadyExists:(accessToken:string,decoded:JwtPayload)=>void):Promise<User|undefined> => {
    const accessToken = response.credential
    const current = await Parse.User.current()
    const decoded = jwtDecode(accessToken);
    const userEmail = decoded.email
    console.log(decoded)
    const userGoogleId = decoded.sub
    const userTokenId = accessToken
    const userToLogin: Parse.User = current || new Parse.User();
    userToLogin.set('username', userEmail);
    userToLogin.set('email', userEmail);
    try {
        let loggedInUser: Parse.User = await userToLogin.linkWith('google', {
            authData: {id: userGoogleId, id_token: userTokenId},
        })
        localStorage.setItem('user', JSON.stringify(decoded))
        if(!loggedInUser.get('FirstName')) {
            loggedInUser.set('FirstName', decoded.given_name)            
        }
        if(!loggedInUser.get('LastName')) {
            loggedInUser.set('LastName', decoded.family_name)
        }
        await loggedInUser.save()
        userLogin.next(toUser(loggedInUser))
        return loggedInUser
    } catch(e) {
        if(e.code==202) {
            onAlreadyExists(accessToken, decoded)            
        } else {
            console.log(e)
            throw e
        }
    }
}

export interface SubmissionQuery {
    startDate?:Date,
    endDate?:Date,
    reqNumber:string,
    license:string
}

export interface SimpleReport {
    id: string
    license: string
    state: string
    timeofreport: Date
    reqnumber: string
    typeofcomplaint: ComplaintType
    files: string[]
    loc1_address: string
    location: number[]
}

const transformSubmission = (p:Parse.Object): SimpleReport => {
    const loc = p.get('location')
    return {
        id: p.id,
        license: p.get('license'),
        state: p.get('state'),
        timeofreport: p.get('timeofreport'),
        typeofcomplaint: p.get("typeofcomplaint"),
        loc1_address: p.get('loc1_address'),
        reqnumber: p.get("reqnumber") || '',
        location: [loc.latitude, loc.longitude  ],
        files: [p.get('photoData0'),p.get('photoData1'),p.get('PhotoData3')].filter(x=>x!=null).map(x=>x.url())
    } as SimpleReport
}

// Example usage
export const querySubmissions = async ({startDate, endDate, reqNumber, license }: SubmissionQuery): Promise<SimpleReport[]> => {
    const Submission = Parse.Object.extend("submission");
    const query = new Parse.Query(Submission);
    const currentUser = Parse.User.current();
    query.equalTo("user", currentUser);

    // Date range filter for `timeofincident`
    if (startDate && endDate) {
      query.greaterThanOrEqualTo("timeofincident", startDate);
      query.lessThanOrEqualTo("timeofincident", endDate);
    } else if (startDate) {
    //   query.greaterThanOrEqualTo("timeofincident", startDate);
    }
  
    // Partial match for `reqnumber`
    if (reqNumber) {
      query.matches("reqnumber", reqNumber, "i"); // Case-insensitive regex match
    }
  
    // Partial match for `license`
    if (license) {
      query.matches("license", license, "i"); // Case-insensitive regex match
    }
    query.ascending("timeofincident");
    try {
        console.log(query)
      const results = await query.find();
      console.log("Query Results:", results);
      return results.map((x:any)=>transformSubmission(x as Parse.Object));
    } catch (error) {
      console.error("Error querying submissions:", error);
      throw error;
    }
  }
export const forgotEmail = async (email:string):Promise<any> => {
    await Parse.User.requestPasswordEmail(email)
    return true
}

export const isLoggedIn = async():Promise<User | undefined> => {
    const user = await Parse.User.current()
    return user && toUser(user)
}

function toUser(user:Parse.User): User {
    return {
        firstName: user.get('FirstName'),
        lastName: user.get('LastName'),
        phone: user.get('Phone'),
        email: user.get('email'),
        id: user.id
    } as User
}

export const logout = async():Promise<any> => {
    await Parse.User.logOut()
    localStorage.clear()
    userLogout.next(true)
    return true
}