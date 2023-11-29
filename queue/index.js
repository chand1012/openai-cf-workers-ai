export default async function (batch, env) {
	for (const msg of batch.messages) {
		// for now just print the content
		console.log(msg.body);
		msg.ack();
	}
}
