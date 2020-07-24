const Discord = require('discord.js');
const env = require('.\\config.json');
const client = new Discord.Client();
const db = require('.\\models\\index');

const fs = require("fs");
const vm = require('vm');

const Queue = require('bull');
let embedQueue = new Queue('embed', 'redis://'+env.redis_host+':'+env.redis_port);

// Getting every commands in the 'commands' folder
client.commands = new Discord.Collection();
console.log("test");
const commandFiles = fs.readdirSync('commands').filter(file => file.endsWith('.js'));
console.log("test"+commandFiles);
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}

const STATUT = {
	RETARD: 1,
	PRESENT: 2,
	EN_ATTENTE: 3,
	ABSENT: 4
};

client.once('ready', () => {
	console.log('Ready!');

	// Queue process to send embed in queue with the channel provided
	embedQueue.process(async (job,done) =>{
		console.log("Sending embed to channel "+job.data.channel_id);
		client.channels.fetch(job.data.channel_id)
			.then((channel) => {
				channel.send({embed: job.data.embed});
				done();
			})
	});
});

client.login(env.token);

client.on('message', message => {
	// Get message command and arguments
	if (!message.content.startsWith(env.prefix) || message.author.bot) return;


	const args = message.content.slice(env.prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName)
	|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	if (!command) return;

	// Check if the command need arguments
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;
		if (command.usage) {
			reply += `\nThe proper usage would be: \`${env.prefix}${command.name} ${command.usage}\``;
		}
		return message.channel.send(reply);
	}

	try{
		command.execute(message, args);
	}catch(error){
		console.log(error);
	}

});

