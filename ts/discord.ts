import * as Discord from 'discord.js'

import config from './config';

import * as Data from './csvParser'
import * as Requester from './requester'
import * as Embedder from './embedder'
import * as Processor from './processor'

const client = new Discord.Client();

/*
rules is a map of keywords to functions:
functions are triggered by messages of the form @Warden <keyword>,
anything after the keyword is considered the arguments of the function.

functions must take three parameters:
args: message.content.split(" ")
channel: id of the channel where the msg was sent
content: message.content in string form
*/
var rules = new Map();

client.once('ready', () => {
   rules.set("help", help);
   // rules.set("list", describeAllProjects)
   rules.set("describe", describe);
   rules.set("createissue", createIssue);
   rules.set("closeissue", closeIssue);
   rules.set("assign", assignIssue);
});


client.on('message', async (message) => {
   if (message.author.bot) return;                      // ignoring bots
   const args = message.content.trim().split(/ +/g);    // split by spaces

   // only considers msgs of form @Warden <keyword> ...
   if (args[0] != `<@${config.botUserID}>` || args.length == 1) return;


   const command = args[1];

   if (rules.has(command)) {     // calling command from map
      rules.get(command)(args, message.channel, message.content);
   } else {
      message.channel.send("that command doesn't exist")
   }
});

// assigns or reassigns an issue to someone
// the message must be in the form @Warden assign issue <number> to <@user>
function assignIssue(content, channel, message) {
   if (!(content.length == 6 && content[2] == "issue" && content[4] == "to")) return;

   let index = projectIDFromChannel(channel.id);
   if (index == -1) {
      channel.send("invalid channel")
      return;
   }

   // getting the project name from the project data
   let project : string = (Data.projectData)[index].shortname;

   // the issue number should be the 4th element in the message
   // handles invalid issue numbers (strings, etc.)
   let issue = parseInt(content[3]);
   if (issue == NaN) {
      channel.send("not a valid issue number")
      return;
   }

   // gets the gitlab id from someone's discord id
   // content[5] should be the tag of someone (this enables assigning issues
   // to people just by pinging them in discord)
   let gitlabID : string = Processor.getGitlabIDfromDiscordID(content[5], Data);

   if (gitlabID=="-1") {
      channel.send("not a valid assignee")
      return;
   }

   // requesting
   let projectUrl = `${config.apiURL}${project}/issues/${issue}`;
   let response = Requester.makeRequest("PUT", projectUrl, {
      "PRIVATE-TOKEN": config.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
   }, {
      assignee_ids: parseFloat(gitlabID)
   });
   
   response.then((value: any) => {
      if (value.error)
         channel.send(value.error);
      else {
         // sends an embed for the issue 
         channel.send(Embedder.createSingleIssueFromOneData(value, (Data.projectData)[index].name, value.iid))
      }
   }, (error) => {
      channel.send("Error: " + error.body);
   })

}

// closes an issue
// the message must be in the form @Warden close issue <number>
function closeIssue(content, channel, message) {
   if (content.length != 3) {
      channel.send("bad syntax")
      return;
   }

   // getting the project
   let index = projectIDFromChannel(channel.id);
   if (index == -1) {
      channel.send("invalid channel")
      return;
   }
   let project: string = (Data.projectData)[index].shortname;

   // makes sure the issue number is valid
   let issue = parseInt(content[3]);
   if (issue == NaN) {
      channel.send("not a valid number")
      return;
   }

   // requesting
   let projectUrl = `${config.apiURL}${project}/issues/${issue}`;
   let response = Requester.makeRequest("PUT", projectUrl, {
      "PRIVATE-TOKEN": config.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
   }, {
      state_event: "close" // sets the state of the issue to closed
   });
   response.then((value: any) => {
      if (value.error)
         channel.send(value.error);
      else {
         channel.send("Issue successfully closed:")
         channel.send(Embedder.createSingleIssueFromOneData(value, (Data.projectData)[index].name, value.iid))
      }
   }, (error) => {
      channel.send(error);
   })
}

// creates a new issue. 
// syntax is @Warden createissue "title: my title" "description: my description" "assignee: @user"
// only the title field is mandatory.
function createIssue(content, channel, message) {
   if (!(content.length == 4 && content[2] == "issue")) return;

   // fetching the project (depends on what channel the message was sent in)
   // if the message was sent in an invalid channel, responds as such
   let index = projectIDFromChannel(channel.id);
   if (index == -1) {
      channel.send("invalid channel")
      return;
   }

   // processes fields passed in from the command message and converts them to a JSON (has to follow a certain syntax)
   let issueData = Processor.processCreateIssue(message, Data);

   let project: string = (Data.projectData)[index].shortname;

   let projectUrl = `${config.apiURL}${project}/issues`;

   // getting the fields for the new issue 
   // if a field does not exist in the issueData JSON object, it will just be undefined
   // note: if the assignee field does not exist, an empty array must be passed in instead of undefined
   let issueDetails = {
      title: issueData.title, // required
      description: issueData.description,
      assignee_ids: (issueData.assignee == undefined || issueData.assignee == -1) ? [] : parseInt(issueData.assignee),
      due_date: issueData.duedate, // not implemented as of now
      labels: issueData.labels // not implemented as of now
   };

   // requesting...
   let response = Requester.makeRequest("POST", projectUrl, {
      "PRIVATE-TOKEN": config.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
   }, issueDetails);
   response.then((value: any) => {
      if (value.error)
         channel.send(value.error);
      else {

         channel.send("Issue created");
         channel.send(Embedder.createSingleIssueFromOneData(value, (Data.projectData)[index].name, value.iid))

      }
   }, (error) => {
      channel.send(error);
   });
}

/*
Handles 'describe' functions based on the message's syntax. 

1) @Warden describe issues
This describes the last 15 open issues (at most 15) of the project.

2) @Warden describe issue <number>
This describes the issue with issue ID <number>

Note: Gitlab generally generates issue IDs in increasing but not 
necessarily sequential numerical order.
*/
function describe(content: string[], channel: Discord.TextChannel, message: string) {

   if (content.length == 3 && content[2] == "issues") {
      // describe issues
      describeIssues(content, channel)

   } else if (content.length == 4 && content[2] == "issue") {
      // describe issue <number>
      describeIssue(content, channel);
   }
}

// see describe function comments for details
function describeIssues(content: string[], channel: Discord.TextChannel) {

   let index = projectIDFromChannel(channel.id);
   if (index == -1) {
      channel.send("invalid channel")
      return;
   }
   // getting the project name and shortname from csv data
   let projShortName: string = (Data.projectData)[index].shortname;

   let projectUrl = `${config.apiURL}${projShortName}/issues?state=opened&per_page=${config.issuesPerDescribe}`

   Requester.getIssues(projectUrl).then((value) => {

      let issueEmbed = Embedder.createSingleProject(JSON.parse(value.body), Data.projectData[index], value.headers[value.headers.indexOf('X-Total') + 1]);

      channel.send(issueEmbed)

   }, (error) => {
      channel.send(error);
   })
}

// see describe function comments for details
function describeIssue(content: string[], channel: Discord.TextChannel) {

   // getting the project from the channel ID
   let index = projectIDFromChannel(channel.id);

   if (index == -1) {
      channel.send("invalid channel")
      return;
   }
   // getting the project name and shortname
   let projShortName: string = (Data.projectData)[index].shortname;
   let projName: string = (Data.projectData)[index].name;

   // getting the id of the issue that was asked for
   // if an invalid id, like a string, was sent, responds as such
   let issue = parseInt(content[3]);
   if (issue == NaN) {
      channel.send(`"${content[3]}" is not a valid issue number`)
      return;
   }

   let url = `${config.apiURL}${projShortName}/issues?per_page=100`

   Requester.getIssues(url).then((value) => {

      let issueEmbed = Embedder.createSingleIssueFromAllData(JSON.parse(value.body), projName, issue);

      channel.send(issueEmbed)

   }, (error) => {
      channel.send(error);
   })
}

// see describe function comments for details
function describeAllProjects(content: string[], channel: Discord.TextChannel) {
   channel.send(Embedder.createAllProjects(Data.projectData))
}

function help(content: string[], channel: Discord.TextChannel) {
   channel.send(Embedder.createHelp());
}

function projectIDFromChannel(id) {
   return Data.projectIDs.indexOf(parseInt(id));
}



client.login(config.bot_token);
