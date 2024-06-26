import { itemByViewKey, itemViewskey, itemsKey } from '$services/keys';
import { createClient,defineScript } from 'redis';
import { createIndexes } from './create-indexes';

const client = createClient({
	socket: {
		host: process.env.REDIS_HOST,
		port: parseInt(process.env.REDIS_PORT)
	},
	password: process.env.REDIS_PW,
	scripts: {
		incrementView: defineScript({
			NUMBER_OF_KEYS: 3,
			SCRIPT: `
			local itemViewsKey = KEYS[1]
            local itemsKey = KEYS[2]
			local itemByViewKey = KEYS[3]
			local itemId = ARGV[1]
			local userId = ARGV[2]
            local inserted = redis.call("PFADD",itemViewsKey,userId)
			if inserted == 1 then
			 redis.call("HINCRBY",itemsKey,"views",1)
			 redis.call("ZINCRBY",itemByViewKey,1,itemId)
			end
			`,
			transformArguments(itemId: string,userId: string) {
				return [
					itemViewskey(itemId),
					itemsKey(itemId),
					itemByViewKey(),
					itemId,
					userId
				]
			},
			transformReply() {	}
        // Evalsha ID 3 [this above array elements one by one]
		}),
		unlock: defineScript({
			NUMBER_OF_KEYS: 1,
			transformArguments(key: string, token: string) {
				return [key, token];
			},
			transformReply(reply: any) {
				return reply;
			},
			SCRIPT: `
				if redis.call('GET', KEYS[1]) == ARGV[1] then
					return redis.call('DEL', KEYS[1])
				end
			`
		}),
	}
});


client.on('error', (err) => console.error(err));
client.connect();

client.on('connect',async() => {
	try {
		await createIndexes()
	} catch (error) {
		console.error(error)		
	}
})

export { client };
