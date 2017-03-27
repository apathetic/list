/**

 Description:  Maintain state of application via URL. Will parse query args
               to apply previoius-filter states.

*/


import { parseQueryArgs } from '../common/helpers.js';

export default class state {

  constructor() {
    this.getParameters();
    this.setFilters();
  }

  /**
   * Determine any query parameters / filter values from the URL. This is useful
   * if the user lands on this page from a copy / pasted link, and enables the
   * correct filters to be maintained and applied.
   * @return {void}
   */
  getParameters() {
    this.params = parseQueryArgs(window.location.search);

    // set query to empty string if not set. This will allow the initial search (returning
    // all results), but subsequent searches will need a query
    if (!this.params.q) {
      this.params.q = '';
    }
  }

  /**
   * Update the URL solely for display or copy / paste purposes.
   * @param  {String} filter The filter group to update.
   * @param  {String} value The value of the filter.
   * @return {void}
   */
  updateURL() {
    if (window.history.pushState) {
      const q = Object.keys(FILTERS).reduce((queryString, currentFilter) => {
        return FILTERS[currentFilter].length ?
          queryString + '&' + currentFilter + '=' + FILTERS[currentFilter].join(',') :
          queryString;
      }, '?q=' + this.params.q);
      const url = window.location.protocol + '//' + window.location.host + window.location.pathname + q;

      window.history.replaceState({}, document.title, url);
    }
  }

  /**
   * Update the displayed filter values based on query params.
   * @return {void}
   */
  setFilters() {
    Object.keys(FILTERS).forEach((group) => {
      if (this.params[group]) {
        FILTERS[group] = this.params[group].split(',');
        FILTERS[group].forEach((filter) => {
          this.getFilter(group, filter).checked = true;
        });
      }
    });
  }
}
