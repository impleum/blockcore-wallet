import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Permission, PermissionDomain } from 'src/shared';
import { PermissionExecutionStore } from 'src/shared/store/permission-execution-store';
import { PermissionStore } from 'src/shared/store/permission-store';
import { UIState, FeatureService, NetworkStatusService, WalletManager } from '../../services';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PermissionsComponent implements OnDestroy, OnInit {
  permissions: PermissionDomain[];
  executions: any[];

  constructor(
    private walletManager: WalletManager,
    public uiState: UIState,
    public location: Location,
    public networkStatus: NetworkStatusService,
    public feature: FeatureService,
    private permissionStore: PermissionStore,
    private permissionExecutionStore: PermissionExecutionStore,
    public translate: TranslateService
  ) {
    this.uiState.title = 'Permissions';
    this.uiState.showBackButton = true;
    this.uiState.goBackHome = false;
  }

  async ngOnInit() {
    this.uiState.title = await this.translate.get('Settings.Permissions').toPromise();
    // Make sure we reload the permission store every time user opens the UI.
    // this.permissionStore.load();
    await this.refresh();
  }

  getWalletName(walletId: string) {
    return this.walletManager.getWallet(walletId)?.name;
  }

  getAccountName(walletId: string, accountId: string) {
    const wallet = this.walletManager.getWallet(walletId);
    return this.walletManager.getAccount(wallet, accountId)?.name;
  }

  async remove(permission: Permission, permissionSet: PermissionDomain) {
    const permissions = permissionSet.permissions[permission.action] as Permission[];

    const index = permissions.findIndex((p) => p.key == permission.key);

    if (index > -1) {
      const permissionKey = PermissionStore.permissionKey(permissions[index]);
      this.permissionExecutionStore.remove(permissionKey);
      permissions.splice(index, 1);
    }

    // delete permissionSet.permissions[permission.action];

    await this.permissionStore.save();
    await this.permissionExecutionStore.save();
    await this.refresh();
  }

  async refresh() {
    await this.permissionStore.load();
    this.permissions = this.permissionStore.all();

    await this.permissionExecutionStore.load();
    this.executions = this.permissionExecutionStore.all();
  }

  executedCount(permission: Permission)
  {
    const key = PermissionStore.permissionKey(permission);
    return this.permissionExecutionStore.get(key).executions;
  }

  toArray(items: any): Permission[][] {
    return Object.values(items);
  }

  ngOnDestroy() {}

  cancel() {
    this.location.back();
  }

  async removeAllPermissions() {
    await this.permissionStore.wipe();
    await this.permissionExecutionStore.wipe();

    await this.refresh();
  }
}
