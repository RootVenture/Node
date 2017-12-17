import axios from 'axios';
// to prevent crosssite XSS attacks
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores
    .map(
    store => `
         <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `
    )
    .join('');
}

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function () {
    // if no value, quit it!
    if (!this.value) {
      searchResults.style.display = 'none'; // hides
      return; // stop!
    }
    // show the search results
    searchResults.style.display = 'block';
    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          // if there is data
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
          return;
        }
        // tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(
          `<div class ="search__result">No results for ${this.value} found!</div>`
        );
      })
      .catch(err => {
        console.error(err);
      });
  });

  // handle keyboard inputs
  searchInput.on('keyup', e => {
    // if the aren't pressing up, down or enter, skip!
    if (![38, 40, 13].includes(e.keyCode)) {
      return;
    }
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;

    // logic to cycle through search
    if (e.keyCode === 40 && current) {
      // next sibling or the first element
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
      // handle enter key && there is a current element
    } else if (e.keyCode === 13 && current.href) {
      // change page to the href
      window.location = current.href;
      return;
    }

    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

export default typeAhead;
