
function showSourceCode() {
  document.getElementById("source-code").scrollIntoView({behavior: 'smooth'})

  setTimeout(() => {
    document.getElementById("source-code").classList.add("shake")
  }, "200");

  setTimeout(() => {
    document.getElementById("source-code").classList.remove("shake")
  }, "1000");
}

function respondToFragment() {
  if (window.location.hash == "#source-code") {
    showSourceCode()
  }
}

function attachSourceCodeEventListeners() {
  addEventListener("hashchange", (event) => {respondToFragment()})

  document.querySelectorAll('a[href="#source-code"]').forEach((elem) => {
    elem.addEventListener("click", (event) => {
      event.preventDefault()
      showSourceCode()
    })
  })
}

setTimeout(() => {
  respondToFragment()
  attachSourceCodeEventListeners()
}, "500");

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))