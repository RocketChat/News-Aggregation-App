import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";

import { NewsAggregationApp } from "../NewsAggregationApp";

import { NewsItem } from "./NewsItem";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";

export function createNewsSource() {
    return class NewsSource {
        app: NewsAggregationApp;
        news: NewsItem[] = [];

        constructor(app: NewsAggregationApp, news: NewsItem[]) {
            this.news = news;
            this.app = app;
        }

        async fetchNews(
            read: IRead,
            modify: IModify,
            room: IRoom,
            http: IHttp,
            persis: IPersistence
        ): Promise<any> {}

        async getNews(
            read: IRead,
            modify: IModify,
            room: IRoom,
            http: IHttp,
            persis: IPersistence
        ): Promise<any> {}
    }
}

