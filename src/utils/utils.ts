/// <reference types="chrome"/>

import { Action, Request, Response } from '../models/message.interface';
import { setHours, setMinutes } from 'date-fns';

export async function sendAction(action: Action, body?: any): Promise<Response> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, body } as Request, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(response);
      }
    });
  });
}

export function receiveMessage(handler: (request: Request, sender: chrome.runtime.MessageSender) => Promise<any>): void {
  chrome.runtime.onMessage.addListener((request: Request, sender, sendResponse) => {
    const response: Response = {};
    handler(request, sender)
      .then(body => {
        response.body = body;
        sendResponse(response)
      })
      .catch(err => {
        console.log(err);
        response.error = { message: err.message };
        sendResponse(response);
      });
    return true;
  });
}

export async function getTab(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, tab => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(tab);
      }
    });
  });
} 

export async function getAllTabs(): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, tabs => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(tabs.filter(tab => tab.id && tab.url !== undefined));
      }
    });
  });
}

// https://stackoverflow.com/a/5717133/11994724
export function isValidUrl(str: string): boolean {
  var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  return !!pattern.test(str);
}

export function parseTime(timeStr: string | undefined): Date | undefined {
  if (!timeStr) {
    return undefined;
  }
  const pattern = /^(0?[0-9]|1[0-2]):([0-5][0-9]) ?(am|pm)$/i;
  const match = pattern.exec(timeStr);
  if (!match || match.length < 4) {
    return undefined;
  }
  let date = new Date();
  const [hours, minutes, ampm] = match.slice(1, 4);
  date = setHours(date, parseInt(hours) + (ampm == 'am' ? 0 : 12));
  date = setMinutes(date, parseInt(minutes));
  return date;
}

export function getTimeInSecs(time: Date) {
  const date = new Date(time);
  return date.getHours() * 60 + date.getSeconds();
}