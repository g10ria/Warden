const csv = require('csv-parser');
const fs = require('fs');

var projectData = []; // all data on each project
var projectIDs : number[] = []; // each project's channel ID

fs.createReadStream('../data/projectInfo.csv')
  .pipe(csv())
  .on('data', (row) => {
    projectIDs.push(parseInt(row.channelID));
    projectData.push(row);
  })
  .on('end', () => {
    console.log('Project CSV successfully processed');
  });

  /*
  Project status:
  0 = Active
  1 = On Hold
  2 = Completed
  3 = Abandoned
  */


var userGitlabIDs : number[] = []; // each user's Gitlab ID
var userDiscordIDs : number[] = []; // each user's Discord ID
var userData = []; // all info about a user

  fs.createReadStream('../data/userInfo.csv')
  .pipe(csv())
  .on('data', (row) => {
    userGitlabIDs.push(parseInt(row.gitlabID)) 
    userDiscordIDs.push(parseInt(row.discordID)) 
    userData.push(row); 
  })
  .on('end', () => {
    console.log('User CSV successfully processed');
  });

  /*
  User status:
  0 = Alumnus Admin (all perms)
  1 = Admin (all perms)
  2 = Alumnus (normal perms)
  3 = Member (normal perms)
  4 = Visitor/Probation (limited perms)
  */


  export {projectData, projectIDs, userData, userDiscordIDs, userGitlabIDs}