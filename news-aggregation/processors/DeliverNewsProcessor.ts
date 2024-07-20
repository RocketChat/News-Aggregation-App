import {
	IJobContext,
	IProcessor,
} from '@rocket.chat/apps-engine/definition/scheduler';
import { NewsAggregationApp } from '../NewsAggregationApp';
import {
	IRead,
	IModify,
	IHttp,
	IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';
import { NewsItem } from '../definitions/NewsItem';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { NewsItemPersistence } from '../persistence/NewsItemPersistence';
import { buildNewsBlock } from '../blocks/UtilityBlocks';
import { sendMessage } from '../utils/message';
import { Block } from '@rocket.chat/ui-kit';
import { SubscriptionPersistence } from '../persistence/SubscriptionPersistence';
import { RoomPersistence } from '../persistence/RoomPersistence';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISubscription } from '../definitions/ISubscription';
import { UserPersistence } from '../persistence/UserPersistence';

export class DeliverNewsProcessor implements IProcessor {
	id: string = 'deliver-news';
	// app: NewsAggregationApp;

	constructor() {}

	public async processor(
		jobContext: IJobContext,
		read: IRead,
		modify: IModify,
		http: IHttp,
		persis: IPersistence
	): Promise<void> {
		console.log('dailynewsdeliverstarted');

		let news: NewsItem[] = [];
		const userStorage = new UserPersistence(
			persis,
			read.getPersistenceReader()
		);
		const userId = await userStorage.getUserId();
		const appUser = (await read.getUserReader().getAppUser()) as IUser;
		const roomStorage = new RoomPersistence(
			userId,
			persis,
			read.getPersistenceReader()
		);
		console.log('dailynewsdeliverstarted2');

		const roomId = await roomStorage.getSubscriptionRoomId();
		console.log('ROOMIDDss:', roomId);

		const room = (await read.getRoomReader().getById(roomId)) as IRoom;

		// const techCrunchAdapter = new TechCrunchAdapter();
		// const techCrunchNewsSource = new NewsSource(
		// 	this.app,
		// 	techCrunchAdapter,
		// 	news
		// );

		const newsStorage = new NewsItemPersistence({
			read,
			modify,
			persistence: persis,
		});

		const subscriptionStorage = new SubscriptionPersistence(
			read.getPersistenceReader(),
			persis
		);
		const allSubscriptions = await subscriptionStorage.getSubscriptions();
		console.log('allSubs: ', allSubscriptions);
		console.log('deliver news working');

		const deliverNews = async (subscription: ISubscription) => {
			let allSubscribedNews: NewsItem[] = [];
			if (subscription?.categories) {
				for (const category of subscription?.categories) {
					news = (await newsStorage.getAllSubscribedNews(
						category
					)) as NewsItem[];

					news = news.slice(0, 10);
					allSubscribedNews = [...allSubscribedNews, ...news];
				}
			}

			function shuffleArray<T>(array: T[]): T[] {
				for (let i = array.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[array[i], array[j]] = [array[j], array[i]]; // Swap elements
				}
				return array;
			}

			allSubscribedNews = shuffleArray(allSubscribedNews);

			for (const item of allSubscribedNews.slice(0, 10)) {
				const newsBlock = await buildNewsBlock(item);
				// newsBlocks.push(newsBlock);
				await sendMessage(modify, room, appUser, '', newsBlock);
			}
		};

		try {
			// get only the news of subscribed categories to subscribed rooms
			await Promise.all([
				allSubscriptions?.map((subscription) => deliverNews(subscription)),
			]);
			console.log('fetched!!', news, 'FETCHED FROM PERSISTENCE!');

			// To implement
			let newsBlocks: Array<Array<Block>> = [];
			// for (const item of news) {
			// 	const newsBlock = await buildNewsBlock(item);
			// 	// newsBlocks.push(newsBlock);
			// 	await sendMessage(this.modify, this.room, appUser, '', newsBlock);
			// }

			console.log('news displayed!');
		} catch (err) {
			// this.app.getLogger().error(err);
			console.error(err);
		}
	}
}