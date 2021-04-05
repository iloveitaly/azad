/* Copyright(c) 2017-2021 Philip Mulcahy. */

import * as azad_entity from './entity';
import * as util from './util';

export interface IItem extends azad_entity.IEntity {
    description: string;
    url: string;
    order_detail_url: string;
    price: string;
    quantity: number;
    order_id: string;
};

export type Items = Record<string, string>;

type ItemsExtractor = (
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string,
) => IItem[];

export function extractItems(
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string,
): IItem[] {
    const strategies: ItemsExtractor[] = [strategy0, strategy1, strategy2, strategy3];
    for (let i=0; i!=strategies.length; i+=1) {
        const strategy = strategies[i];
        try {
            const items = strategy(
                order_id,
                order_detail_url,
                order_elem,
                context + ';extractItems:strategy:' + i,
            );
            if (items.length) {
                return items;
            }
        } catch (ex) {
            console.error('strategy' + i.toString() + ' ' + ex);
        }
    }
    return [];
}

function strategy0(
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string
): IItem[] {
    const itemElems: Node[] = util.findMultipleNodeValues(
        '//div[./div[./div[@class="a-row" and ./a[@class="a-link-normal"]] and .//span[contains(@class, "price") ]/nobr]]',
        order_elem
    );
    const items: IItem[] = <IItem[]>itemElems.map( itemElem => {
        const link = <HTMLElement>util.findSingleNodeValue(
            './/div[@class="a-row"]/a[@class="a-link-normal"]',
            <HTMLElement>itemElem,
            context,
        );
        const description = util.defaulted(link.textContent, '').trim();
        const url = util.defaulted(link.getAttribute('href'), '').trim();
        let qty: number = 0;
        try {
            qty = parseInt(
                util.defaulted(
                    util.findSingleNodeValue(
                        './/span[@class="item-view-qty"]',
                        <HTMLElement>itemElem,
                        context,
                    ).textContent,
                    '1'
                ).trim()
            );
        } catch(ex) {
            qty = 1;
            if (!ex.includes('match')) {
                console.log(ex);
            }
        }
        let price = '';
        try {
            const priceElem = <HTMLElement>util.findSingleNodeValue(
                './/span[contains(@class, "price")]//nobr',
                <HTMLElement>itemElem,
                context,
            );
            price = util.defaulted(priceElem.textContent, '').trim();
        } catch(ex) {
            console.warn('could not find price for: ' + description);
        }
        return {
            description: description,
            url: url,
            order_detail_url: order_detail_url,
            price: price,
            order_id: order_id,
            quantity: qty
        } 
    });
    return items;
}

// Digital orders.
function strategy1(
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string,
): IItem[] {
    const itemElems: Node[] = util.findMultipleNodeValues(
        '//*[contains(text(), "Ordered") or contains(text(), "Commandé")]/parent::*/parent::*/parent::*',
        order_elem
    );
    const items: IItem[] = <IItem[]>itemElems.map( itemElem => {
        const link = <HTMLElement>util.findSingleNodeValue(
            './/a[contains(@href, "/dp/")]',
            <HTMLElement>itemElem,
            context,
        );
        const description = util.defaulted(link.textContent, '').trim();
        const url = util.defaulted(link.getAttribute('href'), '').trim();
        const qty_match = link.parentNode
                             ?.parentNode
                             ?.textContent
                             ?.match(/Qty: (\d+)/);
        const sqty = qty_match ? qty_match[1] : '1';
        const qty = parseInt(sqty);
        const price_match = link.parentNode
                               ?.parentNode
                               ?.nextSibling
                               ?.nextSibling
                               ?.textContent
                               ?.match(util.moneyRegEx())
        const price = price_match ? price_match[1] : '';
        return {
            description: description,
            url: url,
            order_detail_url: order_detail_url,
            price: price,
            order_id: order_id,
            quantity: qty
        } 
    });
    return items;
}

// Amazon.com 2016
function strategy2(
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string,
): IItem[] {
    const itemElems: Node[] = util.findMultipleNodeValues(
        '//div[contains(@id, "orderDetails")]//a[contains(@href, "/product/")]/parent::*',
        order_elem
    );
    const items: IItem[] = <IItem[]>itemElems.map( itemElem => {
        const link = <HTMLElement>util.findSingleNodeValue(
            './/a[contains(@href, "/product/")]',
            <HTMLElement>itemElem,
            context,
        );
        const description = util.defaulted(link.textContent, '').trim();
        const url = util.defaulted(link.getAttribute('href'), '').trim();
        const qty_match = link.parentNode
                             ?.parentNode
                             ?.textContent
                             ?.match(/Qty: (\d+)/);
        const sqty = qty_match ? qty_match[1] : '1';
        const qty = parseInt(sqty);
        const price_match = link.parentNode
                               ?.parentNode
                               ?.nextSibling
                               ?.nextSibling
                               ?.textContent
                               ?.match(util.moneyRegEx())
        const price = price_match ? price_match[1] : '';
        return {
            description: description,
            url: url,
            order_detail_url: order_detail_url,
            price: price,
            order_id: order_id,
            quantity: qty
        } 
    });
    return items.filter( item => item.description != '' );
}
// This strategy works for Amazon.com grocery orders in 2021.
function strategy3(
    order_id: string,
    order_detail_url: string,
    order_elem: HTMLElement,
    context: string,
): IItem[] {
    const itemElems: Node[] = util.findMultipleNodeValues(
        '//div[contains(@class, "a-section")]//span[contains(@id, "item-total-price")]/parent::div/parent::div/parent::div',
        order_elem
    );
    const items: IItem[] = <IItem[]>itemElems.map( itemElem => {
        const link = <HTMLElement>util.findSingleNodeValue(
            './/a[contains(@class, "a-link-normal") and contains(@href, "/product/")]',
            <HTMLElement>itemElem,
            context,
        );
        const description = util.defaulted(link.textContent, '').trim();
        const url = util.defaulted(link.getAttribute('href'), '').trim();
        const sqty = link.parentNode?.nextSibling?.textContent?.trim() ?? "1";
        const qty = parseInt(sqty);
        let price = '';
        try {
            const priceElem = <HTMLElement>util.findSingleNodeValue(
                './/span[contains(@id, "item-total-price")]',
                <HTMLElement>itemElem,
                context,
            );
            price = util.defaulted(priceElem.textContent, '').trim();
        } catch(ex) {
            console.warn('could not find price for: ' + description);
        }
        return {
            description: description,
            url: url,
            order_detail_url: order_detail_url,
            price: price,
            order_id: order_id,
            quantity: qty
        } 
    });
    return items;
}
