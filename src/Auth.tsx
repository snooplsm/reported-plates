// Import Parse minified version
import Parse from 'parse/dist/parse.min.js';
import {jwtDecode, JwtPayload} from "jwt-decode";

const PARSE_APPLICATION_ID = 'jkAZF8ojV4vOGnhSBjdwiMWBKpWML5tM4SWGKgOV';
const PARSE_HOST_URL = 'https://parseapi.back4app.com/';
const PARSE_JAVASCRIPT_KEY = 'LeBKOerWTXGBGRLE0yvg2bXa5RRv4e8PuC6INEFA';
Parse.initialize(PARSE_APPLICATION_ID, PARSE_JAVASCRIPT_KEY);
Parse.serverURL = PARSE_HOST_URL;

export type User = Parse.User

export const loginWithPassword = async(email:string, password:string, accessToken:string, jwt:JwtPayload):Promise<User> => {
    try {
        const user = await Parse.User.logIn(email, password)
        return await login({credential:accessToken}, user)
    } catch(e) {
        throw e
    }
}

export const login = async (response:any, onAlreadyExists:(accessToken:string,decoded:JwtPayload)=>void):Promise<User> => {
    const accessToken = response.credential
    const current = await Parse.User.current()
    const decoded = jwtDecode(accessToken);
    const userEmail = decoded.email
    const userGoogleId = decoded.sub
    const userTokenId = accessToken
    const userToLogin: Parse.User = current || new Parse.User();
    userToLogin.set('username', userEmail);
    userToLogin.set('email', userEmail);
    try {
        let loggedInUser: Parse.User = await userToLogin.linkWith('google', {
            authData: {id: userGoogleId, id_token: userTokenId},
        })
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
    await Parse.User.logout()
    return true
}