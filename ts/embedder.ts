import config from './config';

// creates an embed for a single project, with a page of issues
// includes project title, description, lead, and 5 project issues from page <n> 
// <n> is determined by user input
function createSingleProject(issueData, projectData, totalProjects) {
    var workers = " This project is lead by " + projectData.lead + " and worked on by "+projectData.members + ".";
    var count = issueData[0].iid

    var embedJSON = {
        "embed" : {
            "title" : "Issues " + (count-issueData.length+1).toString() + "-"+count+ " of "+totalProjects,
            "description" : projectData.description + workers + "Note that issue numbers are issue IDs, and are not always consecutive",
            "color" : config.embedColor,
            "thumbnail": {
              "url": "https://cdn.discordapp.com/embed/avatars/0.png"
            },
            "author" : {
                "name" : projectData.name,
                "url" : "https://gitlab.dev.harker.org/harkerdev/" + projectData.shortname,
            },
            "fields" : []
        }
    }

    if (issueData.length==0) return embedJSON
    
    for (var key in issueData) {
        if (issueData.hasOwnProperty(key)) {
            embedJSON.embed.fields.push(
                {
                    "name" : "Issue " + count + ": " + issueData[key].title,
                    "value" : (issueData[key].description== "" || issueData[key].description == undefined) ? "[no description]" : issueData[key].description
                }
            )
            count--;
        }
    }

    return embedJSON
}

// creates a single issue embed from all data for all issues from a project
// uses the helper createSingleIssueFromOneData (which only takes in data for one issue, not for all issues)
// includes, title, description, and a link
// if existing, also includes the issue's creation/updated date, creator, due date, assignee, closed 

// @param allData all data for all issues from a project
// @param projectName the name of the project
// @param issueNumber the id of the issue to be created
function createSingleIssueFromAllData(allData, projectName : string, issueNumber : number) {
    var data
    for (let i=0;i<allData.length;i++) {
        if (allData[i].iid==issueNumber) data = allData[i]
    }

    // if the given issue ID is invalid
    if (data==undefined) {
        return {
            "embed": {
                "color" : config.embedColor,
                "title" : "Sorry, there is no issue with ID "+issueNumber
            }
        }
    }

    return createSingleIssueFromOneData(data, projectName, issueNumber);
}

// creates a single issue embed from only the data for one issue
function createSingleIssueFromOneData(data, projectName : string, issueNumber : number) {
    var embedJSON = {
        "embed": {
            "title" : data.title,
            "description" : data.description,
            "url" : data.web_url,
            "color" : config.embedColor,
            "footer": {
                "icon_url" : data.author.avatar_url,
                "text" : "Opened by " + data.author.name
            },
            "author" : {
                "name" : projectName + " Issue #" + issueNumber
            },
            "fields" : []
        }
    }
    
    const state = data.state;

    if (state=="opened") {
        var fieldName = "opened";
        if (data.created_at!=data.updated_at) fieldName = "updated";

        embedJSON.embed.fields.push({ 
            "name" : fieldName,
            "value" : parseDate(data.updated_at)
        })

        if (data.due_date!=null) {
            embedJSON.embed.fields.push({
                "name" : "due at",
                "value" : data.due_date
            })
        }

        const assignees = data.assignees;
        if (assignees.length!=0) {
            var assigneeList = assignees[0].name;
            for(var i=1;i<assignees.length;i++)
                assigneeList += ", "+assignees[i].name

            embedJSON.embed.fields.push({
                "name" : "assigned to",
                "value" : assigneeList
            })
        }

    } else if (state=="closed") {
        embedJSON.embed.fields.push( 
            { 
            "name" : "closed at",
            "value" : parseDate(data.closed_at)
        }, {
            "name" : "closed by",
            "value" : data.closed_by.name
        })

    }
    return embedJSON
}

// creates an embed for all HarkerDev projects, using information from the projectInfo csv
// @param projectData all project data as stored in the csv
function createAllProjects(projectData) {
    // sorting the list of projects according to their status, and then alphabetically
    projectData.sort(function(a,b) {
        if (parseInt(a.status)!=parseInt(b.status)) {
            return parseInt(a.status) - parseInt(b.status); // least goes before
        } else return a.name.localeCompare(b.name)
    })
    var embedJSON = {
        "embed": {
            "title" : "All Projects",
            "description" : "",
            "color" : config.embedColor,
            "thumbnail" : {
                "url" : "https://cdn.discordapp.com/embed/avatars/0.png" // hdev logo
            },
            "fields" : []
        }
    }

    // counting how many projects there are of each status
    var statuses = [0,0,0,0]
    var statusStrings = ["active", "on hold", "complete","abandoned"]
    for (var key in projectData) {
        if (projectData.hasOwnProperty(key)) {
            var projectJSON  = projectData[key]
            embedJSON.embed.fields.push( 
                {
                    "name" : projectJSON.name,
                    "value" : projectJSON.description + " Lead by "+
                    projectJSON.lead + ". Status: " + statusStrings[projectJSON.status] + "."
                }
            )
            statuses[projectJSON.status] += 1;
        }
    }
    var projectStatuses = statuses[0] + " active, "+
                          statuses[1] + " on hold, "+
                          statuses[2] + " complete/being maintained, "+
                          statuses[3] + " abandoned."
    embedJSON.embed.description = projectStatuses;
    return embedJSON;
}

// creates a help function for describing each function
function createHelp() {
    return {
        "embed": {
          "description": "Warden lets you get issue stuff in the channel. Note: has to be in the right channel to work",
          "color": config.embedColor,
          "author": {
            "name": "WardenBot"
          },
          "fields": [
            {
              "name": "help",
              "value": "'@Warden help' to get help."
            },
            {
              "name": "describe",
              "value": "'@Warden describe all projects' to describe all current projects. \n'@Warden describe issues, page 3' to describe page 3 of the project's issues (5 issues per page, starting from the most recent ones) (do this in the project's channel).\n'@Warden describe issue 3' to describe the issue with id 3 of the project. "
            },
            {
              "name": "createissue",
              "value": "'@Warden createissue \"title: SomeTitle\" \"description: SomeDescription\" \"assignee: @someone\"' to create an issue in the project. The title field is mandatory."
            },
            {
              "name": "close issue",
              "value": "'@Warden close issue 3' to close issue with id 3"
            }
            // {
            //   "name": "assignissue",
            //   "value": "'@Warden' assignissue 3 to @someone' to assign or reassign issue 3 to someone."
            // }
          ]
        }
      }
}

// parses the date string into a more readable format
// not implemented yet
function parseDate(date : string) {
    return date;
}

export {createSingleProject, createSingleIssueFromAllData, createSingleIssueFromOneData, createAllProjects, createHelp}