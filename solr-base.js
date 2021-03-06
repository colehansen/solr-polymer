"use strict";

/**
 * `mirador-viewer`
 * An encapsulation of the mirador viewer into a web component custom element.
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
class SolrBase extends Polymer.Element {
  constructor() {
    super();
    return this;
  }

  static get is() { return "solr-base"; }

  static get _DEFAULT_JSONP_ENABLED_CB() { return "DEFAULT_JSONP_ENABLED_CB_" + Math.ceil(Math.random() * 1000000).toString(); }

  static get properties() {
    return {
      solrUrl: String,

      route: Object,

      results: Object,

      searchQuery: {
        type: String,
        default: ""
      },
      rows: {
        type: Number,
        default: 10
      },

      facet: {
        type: Boolean,
        default: false
      },
      facetListFields: Array,
      facetNumberRangesFields: Array,

      jsonp: Boolean,
      jsonpCallback: {
        type: String,
        default: SolrBase._DEFAULT_JSONP_ENABLED_CB
      }
    }
  }

  static get observers() {
    return [
      '_routeChanged(route.*)',
    ]
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.facet) {
      this.addEventListener('facet-list-init', (e) => {
        let facetListKeys = this.facetListFields || [];
        facetListKeys.push(e.detail.key);
        this.set('facetListFields', facetListKeys);
      });
      this.addEventListener('facet-number-range-init', (e) => {
        console.log("init");
        let facetNumberRangesKeys = this.facetNumberRangesFields || [];
        facetNumberRangesKeys.push(e.detail.key);
        this.set('facetNumberRangesFields', facetNumberRangesKeys);
        console.log(this.facetNumberRangesFields);
      });
      this.addEventListener('facet-number-range-update', (e) => {
        // console.log("updating");
        // let facetNumberRanges = this.facetNumberRanges || [];
        // let index = facetNumberRanges.indexOf(facetNumberRanges.find((range) => {
        //   console.log(range.key == e.detail.key);
        //   return range.key == e.detail.key;
        // }));
        // if (index == -1) {
        //   return;
        // } else {
        // facetNumberRanges[index] = e.detail;
        // this.set('facetNumberRanges', facetNumberRanges);
        // console.log(this.facetNumberRanges);
        this.set('route.path', e.detail.url);
      });
    }

    this.addEventListener('search-submit', this._searchSubmitHandler);

    let searchTemplate;
    if (searchTemplate = this.querySelector("template[slot='search']")) {
      // user supplied
      this.__searchInstance = this._stampTemplate(searchTemplate);
      this.$.search.appendChild(this.__searchInstance);
    } else {
      // default
      // this.$.search.appendChild(this.$("slot[name='search']").children[0]);
    }

    let resultsTemplate;
    if (resultsTemplate = this.querySelector("template[slot='results']")) {
      // user supplied
      this.__resultsInstance = this._stampTemplate(resultsTemplate);
      this.$.results.appendChild(this.__resultsInstance);
    } else {
      // default
      // this.$.search.appendChild(this.$("slot[name='search']").children[0]);
    }
  }

  _searchSubmitHandler(e) {
    e.preventDefault();

    // trigger location change
    let urlQuery = this.constructSearchURL(e.detail);
    this.set('route.path', urlQuery);

    return false;
  }

  constructSearchURL(opts) {
    let queryString = new URLSearchParams("");
    for (let opt in opts) {
      queryString.append(opt, opts[opt]);
    }
    if (this.facet && this.facetListFields) {
      queryString.append('facet', 'on');
      queryString.append('facet.mincount', '1');
      for (let facetListField of this.facetListFields) {
        queryString.append('facet.field', facetListField);
      }
    }
    if (this.facet && this.facetNumberRangesFields) {
      for (let rangeField of this.facetNumberRangesFields) {
        queryString.append('facet.range', rangeField);
      }
    }
    return `?${queryString.toString()}`;
  }

  search() {
    // dispatch ajax request to solr if there is a search param
    if (this.route.path != "") {
      let url = this.solrUrl + this.route.path;

      let fetchReponse;

      if (!this.jsonp) {
        let req = new Request(url);
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        let init = {
          method: 'GET',
          headers: headers,
          mode: 'cors',
          cache: 'default'
        };
        fetchReponse = fetch(req, init);
      } else {
        fetchReponse = fetchJsonp(url, {
          jsonpCallbackFunction: this.jsonpCallback
        });
      }

      fetchReponse
      .then((response) => {
        // this also returns a promise
        return response.json();
      })
      .then((data) => {
        window.d = data;
        this.results = data;
        return;
      })
      .catch((err) => {
        console.log(err);
        alert("There was an error fetching your search results. Please try again.");
      });
    }
  }

  _routeChanged(route) {
    // update the search fields based on url
    let urlParams = new URLSearchParams(route.value.path || route.value);
    this.set('searchQuery', urlParams.get("q"));
    this.set('rows', urlParams.get("rows"));
    // trigger search
    this.search();
  }
}

customElements.define(SolrBase.is, SolrBase);
