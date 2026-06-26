// FOR DEVELOPMENT ONLY !
// need to add in HTML: <script src="js/dev-loader.js"></script>
/*
Activate DEVTOOLS:
------------------
in HTML console(web):

localStorage.setItem("dlsDevTools", "1");
location.reload();

- CLOSE DEVTOOLS:
-----------------
in HTML console(web):
localStorage.removeItem("dlsDevTools");
location.reload();

*/
(function loadDlsDevTools() {
    const params = new URLSearchParams(window.location.search);

    const devEnabled =
        params.get("dev") === "1" ||
        localStorage.getItem("dlsDevTools") === "1";

    if (!devEnabled) {
        return;
    }

    const script = document.createElement("script");
    script.src = "js/dls-dev-tests.js?v=" + Date.now();
    script.defer = true;

    document.body.appendChild(script);
})();