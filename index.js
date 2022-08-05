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
    lastPacket = '';
  }
  let interval = null;

  const ws = new WebSocket(`wss://${process.env.ELEMENTSERVER}/api/v1/readings/socket?auth=${process.env.API_KEY}${lastPacket}`);

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
