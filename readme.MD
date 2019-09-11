# WardenBot

WardenBot is a bot for Harker Dev's Discord server used to keep track of information about projects and interact with Gitlab issues in a convenient way.

Project and member information is stored in csvs the data folder - these should be updated when new projects or members are added to Harker Dev. 
The following information is stored about projects: the project name, the ID of the channel for the project on Discord, the name/link of the project on Gitlab, a short description of the project, the project lead, and people who are currently working on the project.
The following information is stored about users: the user's Gitlab ID, Discord ID, name, and current status (admin, member, alumni, "outsider" (external people we may need to communicate with for projects))

To run: clone this repo and run `node js/discord`

## Todo list
add better date parsing to embedder
handle images in issues not showing up in embeds

## Future features to add
providing only a list of active or inactive projects
be able to edit the csv from discord
be able to edit an issue's title/description/due date/labels
be able to create an issue with labels
be able to create an issue with a due date
add perms implementation