import hogan from 'hogan.js';

/**
 * NOTE: this is not really an implmentation of fetch, just a
 *       small-enough piece of it that suits our purposes.
 * @param  {[type]} url            [description]
 * @param  {String} [method='GET'] [description]
 * @return [type]                  [description]
 */
export function fetch(url, method = 'GET') {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url);
    xhr.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function() {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

export const template = { hogan };
