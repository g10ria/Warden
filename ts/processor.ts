// processes input for creating an issue
// input is in the form "name: value"
// this is like absolutely terrible code
function processCreateIssue(message : string, data) {

    let quotes : number[] = []
    let j = -1

    // getting the indices of all quotes in the string and storing indices in an array
    for (let i=0;i<message.length;i++) {
        quotes.push(message.indexOf("\"",j+1))
        j = message.indexOf("\"",j+1)
        if (j==-1) break
    }

    // if there is 0 or 1 quotes, or an odd number of quotes, returns an empty object (the input was invalid - there must be a positive, even number of quotes)
    if (quotes.length<=1 || quotes.length%2==0) return {}
    quotes.pop();
    
    // processing each name/value field in the input string. fields are delineated by double quotes around the name and value, and name and value are separated by a colon
    // in this form "name1: value1" "name2: value2"
    var newIssueData : any = {}
    for(let i=0;i<quotes.length/2;i++) {

        // separating 
        var block = message.substring(quotes[2*i]+1,quotes[2*i+1])

        // if there is a colon in the string
        if (block.indexOf(":")!=-1) {

            // separating name from value (input is in the form name:value)
            var colon = block.indexOf(":");
            var name = block.substring(0,colon).trim() // trimming whitespace
            var value = block.substring(colon+1).trim() // trimming whitespace

            // if the field name is assignee, it needs to convert from discord ID to a gitlab ID
            if (name=="assignee") value = getGitlabIDfromDiscordID(value, data);
            
            // adding the field to issue data
            newIssueData[name] = value
        }
    }
    return newIssueData;
}

// gets one's gitlab id from their discord tag
// @param value the discord tag (in the form <@12345678912345342>)
function getGitlabIDfromDiscordID(value, data) : string {

    // if the discord ID is invalid returns -1
    if (value.length<=3) return (-1).toString();

    // getting the discord ID, trimming the <@ and > from the ends of the string
    let discordID = parseInt(value.substring(2,value.length-1));
    let index = data.userDiscordIDs.indexOf(discordID)

    // if that discord user is not in our user csv returns -1
    if (index==-1) return (-1).toString()
    
    return data.userGitlabIDs[index].toString()
}

export {processCreateIssue, getGitlabIDfromDiscordID}