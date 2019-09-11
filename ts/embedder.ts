import config from './config';

// creates an embed for a single project, with a page of issues
// includes project title, description, lead, and 5 project issues from page <n> 
// <n> is determined by user input
function createSingleProject(issueData, projectData) {

   let embedJSON = {
      "embed": {
         "title": `Last ${issueData.length} open issues:`,
         "description": "Note that the issue number is actually their ID, and issue numbers are not necessarily sequential.",
         "color": config.embedColor,
         "author": {
            "name": projectData.name,
            "url": config.standardURL + projectData.shortname,
         },
         "fields": []
      }
   }

   // adding issues to the embed
   for (let key in issueData) {
      if (issueData.hasOwnProperty(key)) {

         embedJSON.embed.fields.push(
            {
               "name": `Issue ${issueData[key].iid}: ${issueData[key].title}`,
               "value": (issueData[key].description == "" || issueData[key].description == undefined) ? "..." : issueData[key].description
            }
         )

      }
   }

   return embedJSON
}

// creates a single issue embed from all data for all issues from a project
// uses the helper createSingleIssueFromOneData (which only takes in data for one issue, not for all issues)
// includes, title, description, and a link
// if existing, also includes the issue's creation/updated date, creator, due date, assignee, closed 
function describeIssueFromAllData(allData, projectName: string, issueNumber: number) {
   var data
   for (let i = 0; i < allData.length; i++) {
      if (allData[i].iid == issueNumber) data = allData[i]
   }

   // if the given issue ID is invalid
   if (data == undefined) {
      return {
         "embed": {
            "color": config.embedColor,
            "title": "Sorry, there is no issue with ID " + issueNumber
         }
      }
   }

   return describeIssueFromData(data, projectName, issueNumber);
}

function describeIssueFromData(data, projectName: string, issueNumber: number) {
   var embedJSON = {
      "embed": {
         "title": data.title,
         "description": data.description,
         "url": data.web_url,
         "color": config.embedColor,
         "footer": {
            "icon_url": data.author.avatar_url,
            "text": "Opened by " + data.author.name
         },
         "author": {
            "name": projectName + " Issue #" + issueNumber
         },
         "fields": []
      }
   }

   const state = data.state;

   if (state == "opened") {

      var fieldName = "opened";
      if (data.created_at != data.updated_at) fieldName = "updated";

      embedJSON.embed.fields.push({
         "name": fieldName,
         "value": nicerDate(data.updated_at)
      })

      if (data.due_date != null) {
         embedJSON.embed.fields.push({
            "name": "due",
            "value": nicerDate(data.due_date)
         })
      }

      const assignees = data.assignees;
      if (assignees.length != 0) {
         var assigneeList = assignees[0].name;
         for (var i = 1; i < assignees.length; i++)
            assigneeList += ", " + assignees[i].name

         embedJSON.embed.fields.push({
            "name": "assigned to",
            "value": assigneeList
         })
      }

   } else if (state == "closed") {
      embedJSON.embed.fields.push(
         {
            "name": "closed",
            "value": nicerDate(data.closed_at)
         }, {
         "name": "closed by",
         "value": data.closed_by.name
      })

   }
   return embedJSON
}

// creates a help function for describing each function
function createHelp() {
   return {
      "embed": {
         "description": "Warden lets you get issue stuff in the channel. (message has to be in the channel corresponding to the project for specific project stuff to work)",
         "color": config.embedColor,
         "thumbnail": {
            "url": config.botPictureURL
         },
         "author": {
            "name": "warden-bot"
         },
         "fields": [
            {
               "name": "@Warden help",
               "value": `Gets help.`
            },
            {
               "name": "@Warden describe issues",
               "value": `Describes the most recent open issues in a project. Lists at most ${config.issuesPerGet}.`
            },
            {
               "name": `@Warden createissue "title: myTitle" ?"description: myDescription" ?"assignee: @pingsomeone"`,
               "value": `Creates an issue in the project. Only the title field is mandatory.`
            },
            {
               "name": "@Warden close issue <n>",
               "value": "Closes the issue with ID n."
            },
            {
               "name": "@Warden assign issue <n> to @user",
               "value": "Assigns issue with ID n to user (ping their Discord account)."
            }
         ]
      }
   }
}

function nicerDate(date: string) {
   return new Date(date).toUTCString().substring(5, 16)
}

export { createSingleProject, describeIssueFromAllData, describeIssueFromData, createHelp }