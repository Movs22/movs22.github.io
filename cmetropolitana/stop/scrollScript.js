const header = document.getElementById('header');
const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

const contents = document.getElementById("contents")

const lines = header.getElementsByClassName('line');
contents.addEventListener('scroll', () => {
    let scroll = contents.scrollTop / rootFontSize;
    if(scroll < 10) {
        header.classList.remove("expanded")
    } else {
        header.classList.add("expanded")
    }
});