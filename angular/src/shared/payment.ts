import * as qs from 'qs';
import Big from 'big.js';

export class PaymentRequestData {
  address: string;
  network: string;
  options: any;
}

/** Implements the BIP21 with some extra features. https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki */
export class PaymentRequest {
  removeHandler(uri: string) {
    if (uri.indexOf('://') > -1) {
      return uri.substring(uri.indexOf('://') + 3);
    } else {
      return uri;
    }
  }

  decode(uri: string): PaymentRequestData {
    if (uri.indexOf('web+pay://') > -1) {
      throw new Error('Invalid BIP21 URI, should not contain :// prefix: ' + uri);
    }

    var urnScheme = uri.slice(0, uri.indexOf(':')).toLowerCase();
    var split = uri.indexOf('?');
    var address = uri.slice(urnScheme.length + 1, split === -1 ? undefined : split);

    // Depending on how the user interacts with the protocol handler, browsers might append / at the end of the URL,
    // which is then included on the address value. We must ensure that this is removed.
    if (address.indexOf('/') > -1) {
      address = address.substring(0, address.length - 1);
    }

    var query = split === -1 ? '' : uri.slice(split + 1);
    var options = qs.parse(query);

    if (options['amount']) {
      const optionAmount = <string>options['amount'];

      // It is not allowed to use comma, must use period.
      if (optionAmount.indexOf(',') > -1) {
        throw new Error('Invalid amount.');
      }

      const amount = Big(<string>options['amount']);

      if (amount.lt(0)) {
        throw new Error('Invalid amount.');
      }

      // Parse the amount and verify it's a valid Big value.
      options['amount'] = amount.toJSON();
    }

    return { address: address, network: urnScheme, options: options };
  }

  /** Transform all flattened values into PaymentRequestData. */
  transform(data: any): PaymentRequestData {
    const address = data.address;
    const network = data.network;

    const options = data;
    delete options.address;
    delete options.network;

    return { address: address, network: network, options: options };
  }

  encode(request: PaymentRequestData): string {
    var query = qs.stringify(request.options);
    return request.network + ':' + request.address + (query ? '?' : '') + query;
  }

  parseAmount(amount: string) {
    if (amount === undefined || amount === null || amount === '') {
      amount = '0';
    }

    const number = new Big(amount);

    if (number.e < -8) {
      throw new Error('Too many decimals.');
    }

    if (number.e > 10) {
      throw new Error('Too high value.');
    }

    const amountValue = number.times(Math.pow(10, 8));
    return amountValue;
  }
}
