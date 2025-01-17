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

export type User = Parse.User

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
    MISSING_COMPLAINT                
  }

export interface Report {
    license: string
    state:string
    files: File[],
    timeofreport: Date
    address: Feature
    reportDescription: string
    testify: boolean
    passenger: boolean
    typeofcomplaint: ComplaintType
}

export const submitReport = async (r:Report) => {
    const current = await Parse.User.current()
    if(!current) {
        throw Error("Not Logged In")
    }
    const Submission = Parse.Object.extend("Submission")
    const s = new Submission();
    const user = localStorage.getItem('user')
    let authUser:any
    if(user) {
        authUser = JSON.parse(user)
    }
    s.set('license', r.license)
    s.set('state', r.state)
    s.set('medallionNo', r.license)
    s.set('Username', current.get('email'))
    s.set('timeofreported', r.timeofreport)
    s.set('timeofreport', r.timeofreport)
    s.set('LastName', current.get('FirstName') || authUser.given_name)
    s.set('FirstName', current.get('LastName') || authUser.family_name)
    s.set('longitude1', r.address.geometry.coordinates[0].toString())
    s.set('latitude1', r.address.geometry.coordinates[1].toString())
    s.set('latitude', r.address.geometry.coordinates[0])
    s.set('longitude', r.address.geometry.coordinates[1])
    s.set('can_be_shared', true)
    s.set('typeofreport', 'complaint')
    s.set('loc1_address', r.address.properties.label)
    s.set('reportDescription', r.reportDescription)
    s.set('testify', true)
    s.set('operating_system', 'web')
    s.set('Phone',current.get('Phone'))
    s.set('Passenger', false)
    s.set('typeofcomplaint', r.typeofcomplaint)

    let index = 0
    if(r.files.length>2) {
        throw Error("Too Many Files")
    }
    throw Error("ok we have gone far enough")
    for(const file of r.files) {
        const f = new Parse.File(file.name, file);
        const photo = await f.save()
        s.set(`photoData${index}`, photo)
        index++
    }

    const result = await s.save()
}

export const login = async (response:any, onAlreadyExists:(accessToken:string,decoded:JwtPayload)=>void):Promise<User> => {
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
        userLogin.next(loggedInUser)
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

export const forgotEmail = async (email:string):Promise<any> => {
    await Parse.User.requestPasswordEmail(email)
    return true
}

export const isLoggedIn = async():Promise<User | undefined> => {
    const user = await Parse.User.current()
    return user
}

export const logout = async():Promise<any> => {
    await Parse.User.logOut()
    localStorage.clear()
    userLogout.next(true)
    return true
}