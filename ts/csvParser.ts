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

  export {projectData, projectIDs, userData, userDiscordIDs, userGitlabIDs}