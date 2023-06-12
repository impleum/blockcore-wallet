import { Component, OnInit, OnDestroy } from '@angular/core';
import { UIState } from '../../services';
import { ActionService } from 'src/app/services/action.service';

@Component({
  selector: 'app-nostr-encrypt',
  templateUrl: './nostr.encrypt.component.html',
  styleUrls: ['./nostr.encrypt.component.css'],
})
export class ActionNostrEncryptComponent implements OnInit, OnDestroy {
  content: string;

  constructor(public uiState: UIState, public actionService: ActionService) {
    this.actionService.consentType = 'regular';

    this.actionService.status.icon = 'security';
    this.actionService.status.title = 'Encrypt data';
    this.actionService.status.description = `App wants you to perform encryption on the following text`;
  }

  ngOnDestroy(): void {}

  ngOnInit(): void {
    // The content that is prepared for signing is normally an object, to render
    // this to the user, we'd want to make it a nice string if it's not an string.
    if (typeof this.uiState.action.content !== 'string') {
      const cont = this.uiState.action.content as any;
      this.content = JSON.stringify(cont.plaintext);
      // this.content = JSON.stringify(this.uiState.action.content, null, 2);
    } else {
      this.content = this.uiState.action.content;
    }
  }
}
