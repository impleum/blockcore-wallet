import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { EnvironmentService, SettingsService } from '.';
import { Message } from '../../shared/interfaces';
import { EventBus } from '../../shared/event-bus';
import { LoggerService } from './logger.service';
import { RuntimeService } from '../../shared/runtime.service';
import { StateService } from './state.service';
import { WalletManager } from './';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService {
  constructor(
    private ngZone: NgZone,
    private walletManager: WalletManager,
    private state: StateService,
    private settings: SettingsService,
    private runtime: RuntimeService,
    private events: EventBus,
    private router: Router,
    private logger: LoggerService,
    private env: EnvironmentService
  ) {}

  initialize() {
    // TODO: Handle these messages internally when running outside of extension context.
    if (this.runtime.isExtension) {
      chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        // console.log('chrome.runtime.onMessage within ANGULAR!', message);
        this.ngZone.run(async () => {
          const result = await this.handleInternalMessage(message, sender);
          // this.logger.debug(`Process messaged ${message.type} and returning this response: `, result);

          // Only return a response if the result is other than null. Null means we did not handle the message.
          if (result !== null) {
            sendResponse(result);
          }
        });
      });

      chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
        // console.log('chrome.runtime.onMessageExternal 2222 within ANGULAR!');
        this.ngZone.run(async () => {
          const result = await this.handleExternalMessage(message, sender);
          // this.logger.debug(`Process (external) messaged ${message.type} and returning this response: `, result);

          // Only return a response if the result is other than null. Null means we did not handle the message.
          if (result !== null) {
            sendResponse(result);
          }
        });
      });
    } else {
      // 'Running in web mode, event handling is processes by FrontEnd Service.
      // this.events.subscribeAll().subscribe(async (message) => {
      //   this.ngZone.run(async () => {
      //     // Compared to the extension based messaging, we don't have response messages.
      //     // this.logger.debug(`Process message:`, message);
      //     await this.handleMessage(message.data);
      //   });
      // });
    }
  }

  handleInternalMessage(message: Message, sender: chrome.runtime.MessageSender) {
    // If the source is provider, never handle these messages as multiple open
    // instances of the extension will cause callbacks from provider to complete.
    if (message.source === 'provider') {
      return null;
    }

    // We can't do async await in this handler, because the chrome extension runtime does not support it
    // and will begin to throw channel port errors.
    // console.log('CommunicationService:handleInternalMessage:', message);
    try {
      switch (message.type) {
        case 'updated': {
          // console.log('SERVICE WORKER HAS FINISHED INDEXING, but no changes to the data, but we get updated wallet info.', message.data);
          // await this.state.update();
          this.state.refresh();
          return 'ok';
        }
        case 'indexed': {
          // console.log('SERVICE WORKER HAS FINISHED INDEXING!!! WE MUST RELOAD STORES!', message.data);
          this.state.refresh();
          return 'ok';
        }
        case 'reload': {
          // console.log('Wallet / Account might be deleted, so we must reload state.');
          this.state.reload();
          return 'ok';
        }
        case 'network-updated': {
          // console.log('Network status was updated, reload the networkstatus store!');
          this.state.reloadStore('networkstatus');
          return 'ok';
        }
        case 'store-reload': {
          console.log(`Specific store was requested to be updated: ${message.data}`);
          this.state.reloadStore(message.data);

          if (message.data === 'setting') {
            this.settings.update();
          }

          return 'ok';
        }
        case 'timeout': {
          // Timeout was reached in the background. There is already logic listening to the session storage
          // that will reload state and redirect to home (unlock) if needed, so don't do that here. It will
          // cause a race condition on loading new state if redirect is handled here.
          this.logger.info('Timeout was reached in the background service (handleInternalMessage).');

          if (this.walletManager.activeWallet) {
            this.walletManager.lockWallet(this.walletManager.activeWallet.id);
          }

          this.router.navigateByUrl('/home');
          return 'ok';
          //return null;
        }
        // default:
        //   this.logger.warn(`The message type ${message.type} is not known.`);
        //   return 'ok';
        //return null;
      }
    } catch (error: any) {
      return { error: { message: error.message, stack: error.stack } };
    }

    return null;
  }

  async handleExternalMessage(message: any, sender: chrome.runtime.MessageSender) {
    this.logger.info('CommunicationService:onMessageExternal: ', message);
    this.logger.info('CommunicationService:onMessageExternal:sender: ', sender);
  }
}
