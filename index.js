import 'dotenv/config';
import WebSocket from 'ws';
import * as fs from 'node:fs/promises';

// Currently not async, but this is a good place to put it in case we want to make it async later
const handlePackets = async (packets) => {
  packets.forEach(packet => {
    console.log(packet.body); // Implement own handler
  });
};

// Main Method to connect to the server
let run = async () => {
  let lastPacket;

  try {
    let file = await fs.readFile('./lastPacket.txt', 'utf8');
    lastPacket = `&after=${file}`;
  } catch (e) {
    lastPacket = `&after=${process.env.AFTER}`;
  }
  let interval = null;
  let server = `wss://${process.env.ELEMENTSERVER}${process.env.STREAMPATH}?auth=${process.env.API_KEY}${lastPacket}`;
  console.log(`Connecting to ${server}`);
  const ws = new WebSocket(server);

  ws.on('open', () => {
    console.log('connected');

    interval = setInterval(() => {
      ws.ping();
    }, 30000);
  });

  ws.on('message', async (data) => {
    try {
      let packets = JSON.parse(data);

      if (Array.isArray(packets)) {
        packets = packets.filter(packet => packet?.body?.inserted_at);
        if (packets.length > 0) {
          await fs.writeFile('./lastPacket.txt', packets[packets.length - 1].body.inserted_at);

          await handlePackets(packets);
        }
      }
    } catch (e) {
      // Probably a PONG packet
    }
  });

  ws.on('close', () => {
    console.log('disconnected');
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }

    run();
  });
};

run();
