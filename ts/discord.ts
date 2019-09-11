import * as Discord from 'discord.js'

import config from './config';

import * as Data from './csvParser'
import * as Requester from './requester'
import * as Embedder from './embedder'
import * as Processor from './processor'

const client = new Discord.Client();

/*
how this works: rules is a map of keywords to functions.
functions are triggered by single keywords, of the form @Warden <keyword>
anything after the keyword is considered the arguments of the function
if the arguments are invalid, the function is rejected and message is 
send back with details. otherwise, the function goes through

rules maps these keywords (strings) to the functions 
in this way, it is easy to write and add new functions, 
one just needs to set it below, in the client listener 
(maps the functions once this is connected to the discord client(bot)):
rules.set("keyword",myFunction);
*/

var rules = new Map();

client.once('ready', () => {
    rules.set("help",help);
    rules.set("list", describeAllProjects)
    rules.set("describe",describe);
    rules.set("createissue",createIssue);
    rules.set("close",closeIssue);
    rules.set("assign",assignIssue);
});

client.on('message', async (message) => {
    // ignoring messages from bots
    if (message.author.bot) return;

    // splitting the message by spaces
    const args = message.content.trim().split(/ +/g);

    // only considers messages that ping @Warden first and have a command after it
    if (args[0]!="<@584821082561970199>" || args.length==1) return;

    // if the command has a function mapped to it, calls the function
    // passes the array of strings, the channel of the message, and the actual message string into the function
    const command = args[1];
    if (rules.has(command)) rules.get(command)(args, message.channel, message.content);
    else {
        message.channel.send("that command doesn't exist")
    }
});

// assigns or reassigns an issue to someone
// the message must be in the form @Warden assign issue <number> to <@user>
function assignIssue(content, channel, message) {
    if (!(content.length==6 && content[2]=="issue" && content[4]=="to")) return;

    // fetching the project (depends on what channel the message was sent in)
    // if the channel was invalid, like #general, responds as such
    const index = Data.projectIDs.indexOf(parseInt(channel.id));
    if (index==-1) return;

    // getting the project name from the project data
    const project : string = (Data.projectData)[index].shortname;

    // the issue number should be the 4th element in the message
    // handles invalid issue numbers (strings, etc.)
    const issue = parseInt(content[3]);
    if (issue==NaN) {
        channel.send("not a valid issue number")
        return;
    }

    // gets the gitlab id from someone's discord id
    // content[5] should be the tag of someone (this enables assigning issues
    // to people just by pinging them in discord)
    const gitlabID = Processor.getGitlabIDfromDiscordID(content[5], Data);

    // requesting
    let projectUrl = `https://gitlab.dev.harker.org/api/v4/projects/harkerdev%2F${project}/issues/${issue}`;
    const response = Requester.makeRequest("PUT", projectUrl, {
        "PRIVATE-TOKEN": config.apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, {
        assignee_ids: (gitlabID!="-1") ? parseInt(gitlabID) : [] // assigns the issue to the provided assignee, if valid. if invalid, assigns the issue to nobody
    });
    response.then((value : any) => {
        if (value.error) 
            channel.send(value.error);
        else {
            // sends a detailed embed for the single issue
            channel.send(Embedder.createSingleIssueFromOneData(value,(Data.projectData)[index].name,value.iid))
        }
    }, (error) => {
        channel.send("Error: "+error.body);
    })
}

// closes an issue
// the message must be in the form @Warden close issue <number>
function closeIssue(content, channel, message) {
    if (!(content.length==4 && content[2]=="issue")) return;

    // getting the project
    const index = Data.projectIDs.indexOf(parseInt(channel.id));
    if (index==-1) {
        channel.send("invalid channel")
        return;
    }
    const project : string = (Data.projectData)[index].shortname;

    // makes sure the issue number is valid
    const issue = parseInt(content[3]);
    if (issue==NaN) {
        channel.send("not a valid number")
        return;
    }
    
    // requesting
    let projectUrl = `https://gitlab.dev.harker.org/api/v4/projects/harkerdev%2F${project}/issues/${issue}`;
    const response = Requester.makeRequest("PUT", projectUrl, {
        "PRIVATE-TOKEN": config.apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, {
        state_event: "close" // sets the state of the issue to closed
    });
    response.then((value : any) => {
        if (value.error) 
            channel.send(value.error);
        else {
            channel.send("Issue successfully closed:")
            channel.send(Embedder.createSingleIssueFromOneData(value,(Data.projectData)[index].name,value.iid))
        }
    }, (error) => {
        channel.send(error);
    })
}

// creates a new issue. 
// syntax is @Warden createissue "title: my title" "description: my description" "assignee: @user"
// only the title field is mandatory.
function createIssue(content, channel, message) {

    // fetching the project (depends on what channel the message was sent in)
    // if the message was sent in an invalid channel, responds as such
    const index = Data.projectIDs.indexOf(parseInt(channel.id));
    if (index==-1) {
        channel.send("invalid channel")
        return;
    }

    // processes fields passed in from the command message and converts them to a JSON
    // regulations are pretty stringent. see Processor for more information
    const issueData = Processor.processCreateIssue(message, Data);
    
    const project : string = (Data.projectData)[index].shortname;
    let projectUrl = `https://gitlab.dev.harker.org/api/v4/projects/harkerdev%2F${project}/issues`;

    // getting the fields for the new issue 
    // if a field does not exist in the issueData JSON object, it will just be undefined
    // however, if the assignee field does not exist, an empty array must be passed in to the request, simply
    // undefined does not suffice - hence the ternary.
    let issueDetails = { 
        title: issueData.title, // required
        description: issueData.description,
        assignee_ids: (issueData.assignee==undefined || issueData.assignee==-1) ? [] : parseInt(issueData.assignee),
        due_date: issueData.duedate, // not implemented as of now
        labels: issueData.labels // not implemented as of now
    };

    // requesting...
    const response = Requester.makeRequest("POST", projectUrl, {
        "PRIVATE-TOKEN": config.apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, issueDetails);
    response.then((value : any) => {
        if (value.error)
            channel.send(value.error);
        else {
           channel.send("Issue created");
           // send issue embed h ere
        }
    }, (error) => {
        channel.send(error);
    });
}

// handles describe functions based on the message's syntax
/*
Handles 'describe' functions based on the message's syntax. There are 3 kinds of describe
functions, one that describes all HarkerDev projects, one that describes 1 single project and lists
all of its issues, and one that describes 1 issue in 1 project. The latter two determine their
project by what channel the message is sent in.

@param content the message split into an array of words, delimited by spaces
@param channel the channel where the message was sent, and where to respond
@param message the entire string of the sent message

If the message is of the form '@Warden describe this, page <number>', the describe function
will describe the current project and its issues on page <number>. Pages have 5 issues per page
and start from the most recently created.

If the message is of the form '@Warden describe all projects', the describe function will
give a short description of each of HarkerDev's projects, including its leads and current status.
Information for this is based off of a projectInfo.csv in this repository.

If the message is of the form '@Warden describe issue <number>', the describe function will
describe the issue with ID <number> of the current project. Note: Gitlab generally generates issue
IDs in increasing numerical order, but there may be exceptions when it skips a number or two. So,
the issue that was created 7th might have issue ID 8.
*/
function describe(content : string[], channel : Discord.TextChannel, message : string) {
    if (content.length==3 && content[2]=="issues") describeOneEntireProject(content, channel)
    else if (content.length==4 && content[2]=="issue") describeOneIssueInProject(content, channel);
}

// see describe function comments for details
function describeOneEntireProject(content : string[], channel : Discord.TextChannel) {

    // fetching the project (depends on what channel the message was sent in)
    // if the message was sent in an invalid channel, responds as such
    const index = Data.projectIDs.indexOf(parseInt(channel.id));
    if (index==-1) {
        channel.send("invalid channel")
    }
    // getting the project name and shortname from csv data
    const project : string = (Data.projectData)[index].shortname;

    let projectUrl = `https://gitlab.dev.harker.org/api/v4/projects/harkerdev%2F${project}/issues?state=opened&per_page=25`
   
    Requester.getIssues(projectUrl).then((value) => {
        // creates an embed for the project and sends it. also includes info on how many issues the project has.
        const issueEmbed = Embedder.createSingleProject(JSON.parse(value.body), Data.projectData[index],
                                                            value.headers[value.headers.indexOf('X-Total')+1]);
        channel.send(issueEmbed)
    }, (error) => {
        channel.send(error);
    })
}

// see describe function comments for details
function describeAllProjects(content : string[], channel : Discord.TextChannel) {
    channel.send(Embedder.createAllProjects(Data.projectData))
}

// see describe function comments for details
function describeOneIssueInProject(content : string[], channel : Discord.TextChannel) {
    
    // fetching the project (depends on what channel the message was sent in)
    // if the message was sent in an invalid channel, responds as such
    const index = Data.projectIDs.indexOf(parseInt(channel.id));
    if (index==-1) {
        channel.send("invalid channel")
    }
    // getting the project name and shortname from csv data
    const project : string = (Data.projectData)[index].shortname;

    // getting the id of the issue that was asked for
    // if an invalid id, like a string, was sent, responds as such
    const issue = parseInt(content[3]);
    if (issue==NaN) {
        channel.send("\""+[3] +"\" is not a valid issue number")
        return;
    }

    // hoping we never go over 100 issues at a time lmao
    let projectUrl = `https://gitlab.dev.harker.org/api/v4/projects/harkerdev%2F${project}/issues?per_page=100`
    Requester.getIssues(projectUrl).then((value) => {
        const issueEmbed = Embedder.createSingleIssueFromAllData(JSON.parse(value.body),"Url Shortener", issue);
        channel.send(issueEmbed)
    }, (error) => {
        channel.send(error);
    })
}

// sends a help embed!
function help(content : string[], channel : Discord.TextChannel) {
   channel.send(Embedder.createHelp());
}

// login to discord bot
client.login(config.bot_token);
