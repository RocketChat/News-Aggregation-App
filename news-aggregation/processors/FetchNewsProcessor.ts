import {
	IRead,
	IModify,
	IHttp,
	IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';
import {
	IJobContext,
	IOnetimeStartup,
	IProcessor,
	IRecurringStartup,
	StartupType,
} from '@rocket.chat/apps-engine/definition/scheduler';
import { NewsItemPersistence } from '../persistence/NewsItemPersistence';
import { NewsAggregationApp } from '../NewsAggregationApp';
import { TechCrunchAdapter } from '../adapters/source-adapters/TechCrunchAdapter';
import { BBCAdapter } from '../adapters/source-adapters/BBCAdapter';
import { NewsSource } from '../definitions/NewsSource';
import { NewsItem } from '../definitions/NewsItem';
import { SettingEnum } from '../enums/settingEnum';
import { ESPNAdapter } from '../adapters/source-adapters/ESPNAdapter';
import { IConfig } from '../definitions/IConfig';
import { UserPersistence } from '../persistence/UserPersistence';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class FetchNewsProcessor implements IProcessor {
	id: string = 'fetch-news';
	// config: IConfig;
	// app: NewsAggregationApp;

	constructor() {
		// this.config = config;
		console.log('proc: ', this);
	}

	public async processor(
		jobContext: IJobContext,
		read: IRead,
		modify: IModify,
		http: IHttp,
		persis: IPersistence
	): Promise<void> {
		let techCrunchNews: NewsItem[] = [];
		let bbcNews: NewsItem[] = [];
		let espnNews: NewsItem[] = [];

		console.log('proc1: ', this);

		const data = jobContext;
		console.log('jc: ', data);
		console.log('proc2: ', this);

		const persisRead = read.getPersistenceReader();
		console.log('proc3: ', this);

		const userStorage = new UserPersistence(
			persis,
			read.getPersistenceReader()
		);
		const userId = await userStorage.getUserId();
		console.log('userFId: ', userId);

		if (!userId) {
			console.error('No user ID found in job context');
			return;
		}

		const currentUser = (await read.getUserReader().getById(userId)) as IUser;
		if (!currentUser) {
			console.error('User not found');
			return;
		}
		const dm = await read
			.getRoomReader()
			.getDirectByUsernames([currentUser.username]);

		const settingsReader = read.getEnvironmentReader().getSettings();
		const techCrunchSetting = await settingsReader.getById(
			SettingEnum.TECHCRUNCH
		);
		const bbcSetting = await settingsReader.getById(SettingEnum.BBC);
		const espnSetting = await settingsReader.getById(SettingEnum.ESPN);

		// Fetch news items from sources
		if (techCrunchSetting.value) {
			const techCrunchAdapter = new TechCrunchAdapter();
			console.log('hello');
			console.log(this);
			const techCrunchNewsSource = new NewsSource(techCrunchAdapter);
			techCrunchNews = [
				...techCrunchNews,
				...(await techCrunchNewsSource.fetchNews(read, modify, http, persis)),
			];
			console.log('fetch-processor-working2');
		}

		if (bbcSetting.value) {
			console.log('bbc enabled');

			const bbcAdapter = new BBCAdapter();

			const bbcNewsSource = new NewsSource(bbcAdapter);
			console.log('fetch-processor-working2.1');
			bbcNews = [
				...bbcNews,
				...(await bbcNewsSource.fetchNews(read, modify, http, persis)),
			];
		}

		if (espnSetting.packageValue) {
			console.log('espn enabled');
			const espnAdapter = new ESPNAdapter();
			const espnNewsSource = new NewsSource(espnAdapter);
			espnNews = [
				...espnNews,
				...(await espnNewsSource.fetchNews(read, modify, http, persis)),
			];
			console.log('espn fetched');
		}

		console.log('fetch-processor-working3');

		const newsStorage = new NewsItemPersistence({
			read: read,
			modify: modify,
			persistence: persis,
		});
		try {
			const saveTechCrunchNews = techCrunchNews.map(
				(newsItem) => newsStorage.saveNews(newsItem, 'news-category') // source needs to change from where it is fetched.
			);
			const saveBBCNews = bbcNews.map(
				(newsItem) => newsStorage.saveNews(newsItem, 'news-category') // source needs to change from where it is fetched.
			);
			const saveESPNNews = espnNews.map(
				(newsItem) => newsStorage.saveNews(newsItem, 'news-category') // source needs to change from where it is fetched.
			);
			await Promise.all([saveTechCrunchNews, saveBBCNews, saveESPNNews]);
			console.log('all news-items saved!!');
		} catch (err) {
			console.error('News Items could not be save', err);
			// this.app.getLogger().error('News Items could not be save', err);
		}

		console.log('Data', data);
		console.log('FetchNewsProcessor completed.');
	}
}
