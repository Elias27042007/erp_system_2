export function showToast(message, type = "success") {

    let bgClass = {
        success: "bg-success text-white",
        warning: "bg-warning text-dark",
        error:  "bg-danger text-white"
    }[type];

    let wrapper = document.createElement("div");
    wrapper.innerHTML = `
        <div class="toast align-items-center ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    document.querySelector(".toast-container").appendChild(wrapper);

    let toast = new bootstrap.Toast(wrapper.querySelector(".toast"), {
        delay: 5000  // 5 Sekunden
    });
    toast.show();
}
