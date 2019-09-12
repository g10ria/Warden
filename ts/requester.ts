var request = require('request');

import config from './config';

// gets all issues from a projcet, returns response body + headers
function getIssues(projectUrl: string) {
    const opts = {
        url: projectUrl,
        headers: {
            "PRIVATE-TOKEN" : config.apiToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
    return new Promise<any>( function(resolve, reject) {
        request.get(opts, 
            function (error, response, body) {
                if (error) resolve(error)
                else resolve({
                    body: response.body,
                    headers: response.rawHeaders
                })
            }
        )
    })
}

// makes a request with given form data
function makeRequest (requestType : string, 
                        url : string,
                        headers: {[key: string]:any} = {},
                        data: any = {}) {

    return new Promise<JSON> (function (resolve, reject) {
        request({
            method: requestType,
            headers,
            url,
            form: data
        }, function (error, response, body) {
            if (error) resolve(error)
            else resolve(JSON.parse(body))
        })
    })

}

export {getIssues, makeRequest}
