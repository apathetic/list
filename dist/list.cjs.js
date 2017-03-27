'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var hogan = _interopDefault(require('hogan.js'));

/**
 * NOTE: this is not really an implmentation of fetch, just a
 *       small-enough piece of it that suits our purposes.
 * @param  {[type]} url            [description]
 * @param  {String} [method='GET'] [description]
 * @return [type]                  [description]
 */
function fetch(url, method) {
  if ( method === void 0 ) method = 'GET';

  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();

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

var template = { hogan: hogan };

/**

 Description:  Search functionality. Includes filtering, sorting, dynamically
               displaying detailed descriptions, ....

*/

// import template from '../common/template.js';
// import { scrollDepth } from '../common/scroll.js';

var API_ENDPOINT = '/api/search?q=';

var FILTERS = {
  location: [],
  thing: []
  // etc..
};
var COMPARE = {
  title: function title(a, b) { return a.jobTitle.toLowerCase() > b.jobTitle.toLowerCase() ? 1 : -1; },
  titleReversed: function titleReversed(a, b) { return a.jobTitle.toLowerCase() < b.jobTitle.toLowerCase() ? 1 : -1; },
  department: function department(a, b) { return a.jobDepartmentName > b.jobDepartmentName ? 1 : -1; },
  departmentReversed: function departmentReversed(a, b) { return a.jobDepartmentName < b.jobDepartmentName ? 1 : -1; },
  rank: function rank(a, b) { return a.score > b.score ? 1 : -1; }
};

var SELECTOR = {
  updating: 'search--updating',
  hasResults: 'search-page--results'
}
var UI = {
  search: '.search-bar__input',
  filters: '[data-filter]',
  sort: 'input[name="sort"]',
  clear: '.filter__clear'
}
var DISPLAY = {
  pills: '.filter__pills',
  results: '#search-results'
}

var search = function search(handle) {
  var search = handle.querySelector('search__form');
  var templateString = handle.querySelector('#search-results-item').text;

  this.handle = handle;
  this.template = template.compile(templateString);// pre-compile template for speed
  this.filterPills = handle.querySelector(DISPLAY.pills);
  this.display = handle.querySelector(DISPLAY.results);

  this.input = handle.querySelector(UI.search);
  this.filters = handle.querySelectorAll(UI.filters);
  this.sort = handle.querySelectorAll(UI.sort);

  this.addControls();
  this.getResults(this.params.q);

  this.input.value = this.params.q === '*' || !this.params.q ? '' : this.params.q;// update search box display

  search.addEventListener('submit', this.updateResults.bind(this));

  // this.scrollDepth = scrollDepth(document.body, (p) => {
  // if (p > 95) {
  //   this.handle.classList.add(SELECTOR.updating);
  //   this.showResults();
  //   this.handle.classList.remove(SELECTOR.updating);
  // }
  // });
};


/**
 * Fetch search results from the server.
 * @param{String} q The term to search for.
 * @return {void}
 */
search.prototype.getResults = function getResults (q) {
  if (q) {
    this.handle.classList.add(SELECTOR.updating);
    fetch(API_ENDPOINT + q)
      .then(this.createCollection.bind(this))
      .catch(console.log);
  }
};

/**
 * Refresh the Item list by fetching new data from the API endpoint.
 * @param{Event} e The search submit Event.
 * @return {void}
 */
search.prototype.updateResults = function updateResults (e) {
  var query = window.encodeURIComponent(this.input.value);

  e.preventDefault();
  this.params.q = query;

  if (!!query) {
    this.getResults(query);
  }
};

/**
 * Only show 50 results at a time. This is for performance, so that we do not
 * render the entire reuslts set every time a filter is updated.
 * @return {void}
 */
search.prototype.showResults = function showResults () {
    var this$1 = this;

  var perPage = 50;// 50? Yes?
  var i = this.page * perPage;
  var to = ++this.page * perPage; // NOTE increment, here
  var newItems = '';

  for (; i < to; i++) {
    if (!this$1.filteredResults[i]) {
      break;
    }

    newItems += this$1.template.render(this$1.filteredResults[i]);
  }

  this.display.innerHTML += newItems;

  this.scrollDepth.update();
};;


/**
 * Add filter logic to the list.
 * @return {void}
 */
search.prototype.addControls = function addControls () {
    var this$1 = this;

  var filterClear = this.handle.querySelectorAll(UI.clear);

  // Add Filters
  Array.prototype.forEach.call(this.filters, function (filter) {
    var group = filter.getAttribute('data-filter');
    var value = filter.value;

    filter.addEventListener('change', function (e) {
      var index = FILTERS[group].indexOf(value);

      if (filter.checked && !~index) {       // if it was checked and _not_ in filter array
        FILTERS[group].push(value);
      } else if (!filter.checked && ~index) {// if it was _unchecked_ and is in filter array
        FILTERS[group].splice(index, 1);
      }

      this$1.applyFilters();
      this$1.handle.dispatchEvent(new CustomEvent('search:filter', {
        detail: group, bubbles: true
      }));
    });

    this$1.makeAccessible(filter);
  });

  // Add Sorting
  Array.prototype.forEach.call(this.sort, function (sort) {
    var by = sort.value;
    var type = sort.getAttribute('data-sort');

    sort.addEventListener('change', function (e) {
      this$1.applySort(by);
      this$1.handle.dispatchEvent(new CustomEvent('search:sort', {
        detail: by, bubbles: true
      }));
    });

    this$1.makeAccessible(sort);
  });

  // Add Clear button(s)
  Array.prototype.forEach.call(filterClear, function (clear) {
    clear.addEventListener('click', this$1.clearFilters.bind(this$1));
    clear.addEventListener('keydown', function (e) {
      if (e.keyCode === 13) { this$1.clearFilters(); }
    });
  });

  // Add Filter pills functionality
  this.filterPills.addEventListener('click', function (e) {
    var group = e.target.getAttribute('data-group');
    var value = e.target.getAttribute('data-value');

    if (group && value) {
      this$1.getFilter(group, value).click();
    }
  });
};

/**
 * Toggle the form element when the user presses enter on it.
 * @param{HTMLElement} input The input to bind keypresses to.
 * @return {void}
 */
search.prototype.makeAccessible = function makeAccessible (input) {
  var id = input.getAttribute('id');
  var label = this.handle.querySelector('label[for="' + id + '"]');

  if (label) {
    label.addEventListener('keydown', function (e) {
      if (e.keyCode === 13) {
        input.click();
      }
    });
  }
};


/**
 * Sort results by Best Match, Title, or Department.
 * @param{String} by What methodology to sort the results by.
 * @return {void}
 */
search.prototype.applySort = function applySort (by) {
  this.handle.classList.add(SELECTOR.updating);

  if (COMPARE[by]) {
    this.filteredResults.sort(COMPARE[by]);
    this.updateDisplay();
  }
};


/**
 * Apply the selected filters to the results set.
 * @return {void}
 */
search.prototype.applyFilters = function applyFilters () {
  this.handle.classList.add(SELECTOR.updating);

  this.filteredResults = Object.keys(FILTERS).reduce(function (values, currentFilter) {
    var selectedFilters = FILTERS[currentFilter]; // eg. 'Walmart Hourly', 'Asset Protection', ...

    // IMPORTANT: if selectedFilters is empty, do not filter
    return !selectedFilters.length ?
      values :
      values.filter(function (v) {
        // likewise, if the value is empty it gets to stay
        return !!~selectedFilters.indexOf(v[currentFilter]) || !v[currentFilter];
      });
  }, this.results);

  this.updateDisplay();
  this.updateURL();
  this.updateFilterPills();
};

/**
 * Unselect all selected filters and apply results.
 * @return {void}
 */
search.prototype.clearFilters = function clearFilters () {
  for (var group in FILTERS) {
    if (FILTERS.hasOwnProperty(group)) {
      FILTERS[group] = [];
    }
  }

  Array.prototype.forEach.call(this.filters, function (filter) {
    filter.checked = false;
  });

  this.applyFilters();
};

/**
 * Find a particular filter checkbox given its filter group and value.
 * @param{String} group The filter group.
 * @param{String} value The filter value.
 * @return {HTMLElement} The filter HTMLElement.
 */
search.prototype.getFilter = function getFilter (group, value) {
  // TODO memoize filters here
  var filter = document.querySelector('[data-filter="' + group + '"][value="' + value + '"]');

  return filter || {};
};

/**
 * Maintain the list of filter pills in the DOM.
 * @return {void}
 */
search.prototype.updateFilterPills = function updateFilterPills () {
    var this$1 = this;

  this.filterPills.innerHTML = '';
  Object.keys(FILTERS).map(function (group) {
    FILTERS[group].map(function (filter) {
      var element = this$1.getFilter(group, filter);
      var label = element.getAttribute('data-label');

      this$1.filterPills.innerHTML +=
        '<li class="button" data-group="' + group + '" data-value="' + filter + '">' + label + '</li>';
    });
  });
};


/**
 * This creates a new filterable Collection from JSON data returned
 * from the server. Any previous Collection will be blown away.
 * @param{Object} data JSON data returned from the API endpoint.
 * @return {void}
 */
search.prototype.createCollection = function createCollection (data) {
  var items;

  try {
    items = JSON.parse(data).items;
  } catch(e) {
    items = [];
  }

  this.results = items;       // holds original results set. Do not do any descructive operations on this

  this.applyFilters();       // pushes filtered results into this.filteredResults
  this.updateDisplay();

  this.handle.dispatchEvent(new CustomEvent('search:query', {
    detail: [this.params.q, items.length],
    bubbles: true
  }));
};

/**
 * Update the display of the Search Results list.
 * @return {void}
 */
search.prototype.updateDisplay = function updateDisplay () {
  this.page = 0;// reset to first set of results
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
  this.handle.querySelector('.search__term').innerHTML = window.decodeURIComponent(this.params.q);  // "you searched for"
  this.handle.querySelector('.search__count').innerHTML = this.filteredResults.length.toString(); // (x number) results
};;


/**
 * Clear all search results. Clear filters too.
 * @return {void}
 */
search.prototype.clear = function clear () {
  this.input.value = '';
  this.results = [];
  this.filteredResults = [];

  this.clearFilters();
};

module.exports = search;