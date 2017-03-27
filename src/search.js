/**

 Description:  Search functionality. Includes filtering, sorting, dynamically
               displaying detailed descriptions, ....

*/

import { fetch, template } from './helpers.js';

const API_ENDPOINT = '/api.json?q=';

const FILTERS = {
  location: [],
  thing: []
  // etc..
};
const COMPARE = {
  title(a, b) { return a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1; },
  titleReversed(a, b) { return a.title.toLowerCase() < b.title.toLowerCase() ? 1 : -1; },
  department(a, b) { return a.description > b.description ? 1 : -1; },
  departmentReversed(a, b) { return a.description < b.description ? 1 : -1; },
  rank(a, b) { return a.score > b.score ? 1 : -1; }
};

const SELECTOR = {
  updating: 'search--updating',
  hasResults: 'search-page--results'
}
const UI = {
  search: '.search-bar__input',
  filters: '[data-filter]',
  sort: 'input[name="sort"]',
  clear: '.filter__clear'
}
const DISPLAY = {
  pills: '.filter__pills',
  results: '#search-results'
}

export default class search {

  constructor(handle) {
    const search = handle.querySelector('search__form');
    const templateString = handle.querySelector('#search-results-item').text;

    this.handle = handle;
    this.template = template.compile(templateString);  // pre-compile template for speed
    this.filterPills = handle.querySelector(DISPLAY.pills);
    this.display = handle.querySelector(DISPLAY.results);

    this.input = handle.querySelector(UI.search);
    this.filters = handle.querySelectorAll(UI.filters);
    this.sort = handle.querySelectorAll(UI.sort);

    this.addControls();
    this.getResults(this.params.q);

    this.input.value = this.params.q === '*' || !this.params.q ? '' : this.params.q;  // update search box display

    search.addEventListener('submit', this.updateResults.bind(this));

    // this.scrollDepth = scrollDepth(document.body, (p) => {
    //   if (p > 95) {
    //     this.handle.classList.add(SELECTOR.updating);
    //     this.showResults();
    //     this.handle.classList.remove(SELECTOR.updating);
    //   }
    // });
  }


  /**
   * Fetch search results from the server.
   * @param  {String} q The term to search for.
   * @return {void}
   */
  getResults(q) {
    if (q) {
      this.handle.classList.add(SELECTOR.updating);
      fetch(API_ENDPOINT + q)
        .then(this.createCollection.bind(this))
        .catch(console.log);
    }
  }

  /**
   * Refresh the Item list by fetching new data from the API endpoint.
   * @param  {Event} e The search submit Event.
   * @return {void}
   */
  updateResults(e) {
    const query = window.encodeURIComponent(this.input.value);

    e.preventDefault();
    this.params.q = query;

    if (!!query) {
      this.getResults(query);
    }
  }

  /**
   * Only show 50 results at a time. This is for performance, so that we do not
   * render the entire reuslts set every time a filter is updated.
   * @return {void}
   */
  showResults() {
    const perPage = 50;  // 50? Yes?
    let i = this.page * perPage;
    let to = ++this.page * perPage;   // NOTE increment, here
    let newItems = '';

    for (; i < to; i++) {
      if (!this.filteredResults[i]) {
        break;
      }

      newItems += this.template.render(this.filteredResults[i]);
    }

    this.display.innerHTML += newItems;

    this.scrollDepth.update();
  };


  /**
   * Add filter logic to the list.
   * @return {void}
   */
  addControls() {
    const filterClear = this.handle.querySelectorAll(UI.clear);

    // Add Filters
    Array.prototype.forEach.call(this.filters, (filter) => {
      const group = filter.getAttribute('data-filter');
      const value = filter.value;

      filter.addEventListener('change', (e) => {
        const index = FILTERS[group].indexOf(value);

        if (filter.checked && !~index) {         // if it was checked and _not_ in filter array
          FILTERS[group].push(value);
        } else if (!filter.checked && ~index) {  // if it was _unchecked_ and is in filter array
          FILTERS[group].splice(index, 1);
        }

        this.applyFilters();
        this.handle.dispatchEvent(new CustomEvent('search:filter', {
          detail: group, bubbles: true
        }));
      });

      this.makeAccessible(filter);
    });

    // Add Sorting
    Array.prototype.forEach.call(this.sort, (sort) => {
      const by = sort.value;
      const type = sort.getAttribute('data-sort');

      sort.addEventListener('change', (e) => {
        this.applySort(by);
        this.handle.dispatchEvent(new CustomEvent('search:sort', {
          detail: by, bubbles: true
        }));
      });

      this.makeAccessible(sort);
    });

    // Add Clear button(s)
    Array.prototype.forEach.call(filterClear, (clear) => {
      clear.addEventListener('click', this.clearFilters.bind(this));
      clear.addEventListener('keydown', (e) => {
        if (e.keyCode === 13) { this.clearFilters(); }
      });
    });

    // Add Filter pills functionality
    this.filterPills.addEventListener('click', (e) => {
      const group = e.target.getAttribute('data-group');
      const value = e.target.getAttribute('data-value');

      if (group && value) {
        this.getFilter(group, value).click();
      }
    });
  }

  /**
   * Toggle the form element when the user presses enter on it.
   * @param  {HTMLElement} input The input to bind keypresses to.
   * @return {void}
   */
  makeAccessible(input) {
    const id = input.getAttribute('id');
    const label = this.handle.querySelector('label[for="' + id + '"]');

    if (label) {
      label.addEventListener('keydown', (e) => {
        if (e.keyCode === 13) {
          input.click();
        }
      });
    }
  }


  /**
   * Sort results by Best Match, Title, or Department.
   * @param  {String} by What methodology to sort the results by.
   * @return {void}
   */
  applySort(by) {
    this.handle.classList.add(SELECTOR.updating);

    if (COMPARE[by]) {
      this.filteredResults.sort(COMPARE[by]);
      this.updateDisplay();
    }
  }


  /**
   * Apply the selected filters to the results set.
   * @return {void}
   */
  applyFilters() {
    this.handle.classList.add(SELECTOR.updating);

    this.filteredResults = Object.keys(FILTERS).reduce((values, currentFilter) => {
      const selectedFilters = FILTERS[currentFilter];   // eg. 'Walmart Hourly', 'Asset Protection', ...

      // IMPORTANT: if selectedFilters is empty, do not filter
      return !selectedFilters.length ?
        values :
        values.filter((v) => {
          // likewise, if the value is empty it gets to stay
          return !!~selectedFilters.indexOf(v[currentFilter]) || !v[currentFilter];
        });
    }, this.results);

    this.updateDisplay();
    this.updateURL();
    this.updateFilterPills();
  }

  /**
   * Unselect all selected filters and apply results.
   * @return {void}
   */
  clearFilters() {
    for (let group in FILTERS) {
      if (FILTERS.hasOwnProperty(group)) {
        FILTERS[group] = [];
      }
    }

    Array.prototype.forEach.call(this.filters, (filter) => {
      filter.checked = false;
    });

    this.applyFilters();
  }

  /**
   * Find a particular filter checkbox given its filter group and value.
   * @param  {String} group The filter group.
   * @param  {String} value The filter value.
   * @return {HTMLElement} The filter HTMLElement.
   */
  getFilter(group, value) {
    // TODO memoize filters here
    const filter = document.querySelector('[data-filter="' + group + '"][value="' + value + '"]');

    return filter || {};
  }

  /**
   * Maintain the list of filter pills in the DOM.
   * @return {void}
   */
  updateFilterPills() {
    this.filterPills.innerHTML = '';
    Object.keys(FILTERS).map((group) => {
      FILTERS[group].map((filter) => {
        const element = this.getFilter(group, filter);
        const label = element.getAttribute('data-label');

        this.filterPills.innerHTML +=
          '<li class="button" data-group="' + group + '" data-value="' + filter + '">' + label + '</li>';
      });
    });
  }


  /**
   * This creates a new filterable Collection from JSON data returned
   * from the server. Any previous Collection will be blown away.
   * @param  {Object} data JSON data returned from the API endpoint.
   * @return {void}
   */
  createCollection(data) {
    let items;

    try {
      items = JSON.parse(data).items;
    } catch(e) {
      items = [];
    }

    this.results = items;         // holds original results set. Do not do any descructive operations on this

    this.applyFilters();         // pushes filtered results into this.filteredResults
    this.updateDisplay();

    this.handle.dispatchEvent(new CustomEvent('search:query', {
      detail: [this.params.q, items.length],
      bubbles: true
    }));
  }

  /**
   * Update the display of the Search Results list.
   * @return {void}
   */
  updateDisplay() {
    this.page = 0;  // reset to first set of results
    this.display.innerHTML = '';

    this.showResults();

    if (this.filteredResults.length) {
      this.handle.classList.add(SELECTOR.hasResults);
    } else {
      this.handle.classList.remove(SELECTOR.hasResults);
    }

    // Remove the updating class
    this.handle.classList.remove(SELECTOR.updating);

    // TODO:
    this.handle.querySelector('.search__term').innerHTML = window.decodeURIComponent(this.params.q);    // "you searched for"
    this.handle.querySelector('.search__count').innerHTML = this.filteredResults.length.toString();   // (x number) results
  };


  /**
   * Clear all search results. Clear filters too.
   * @return {void}
   */
  clear() {
    this.input.value = '';
    this.results = [];
    this.filteredResults = [];

    this.clearFilters();
  }
}
