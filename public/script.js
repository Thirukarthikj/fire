
document.addEventListener('DOMContentLoaded', function () {
    const productTable = document.getElementById('productTable');
    const cartTable = document.getElementById('cartTable');
    const checkoutButton = document.getElementById('checkoutButton');

    productTable.addEventListener('input', updateSubtotal);
    checkoutButton.addEventListener('click', checkout);

    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const span = document.getElementsByClassName("close")[0];

    document.querySelectorAll('.product-img').forEach(img => {
        img.onclick = function () {
            modal.style.display = "block";
            modalImg.src = this.src;
            captionText.innerHTML = this.alt;
        }
    });

    span.onclick = function () {
        modal.style.display = "none";
    }

    function updateSubtotal(event) {
        const quantityInputs = document.querySelectorAll('.quantity');
        let cartItems = [];

        quantityInputs.forEach((input, index) => {
            const row = input.closest('tr');
            const price = parseFloat(row.querySelector('.price').dataset.price);
            const quantity = parseInt(input.value);
            const subtotalCell = row.querySelector('.subtotal');

            if (quantity > 0) {
                const subtotal = price * quantity;
                subtotalCell.textContent = '₹' + subtotal;
                cartItems.push({
                    sno: index + 1,
                    name: row.cells[1].textContent,
                    quantity: quantity,
                    price: '₹' + price,
                    totalPrice: subtotal
                });
            } else {
                subtotalCell.textContent = '₹0';
            }
        });

        updateCartSummary(cartItems);
    }

    function updateCartSummary(cartItems) {
        cartTable.innerHTML = '';
        let totalAmount = 0;
        let totalItems = 0;

        cartItems.forEach(item => {
            const row = cartTable.insertRow();
            row.insertCell(0).textContent = item.sno;
            row.insertCell(1).textContent = item.name;
            row.insertCell(2).textContent = item.quantity;
            row.insertCell(3).textContent = item.price;
            row.insertCell(4).textContent = '₹' + item.totalPrice;
            totalAmount += item.totalPrice;
            totalItems += item.quantity;
        });

        const cartQuantity = document.getElementById('cartQuantity');
        cartQuantity.textContent = totalItems;

        // Update the total amount in the footer
        const totalAmountCell = document.getElementById('totalAmount');
        totalAmountCell.textContent = '₹' + totalAmount;

        // Store the total amount in a data attribute for later use
        checkoutButton.setAttribute('data-total', totalAmount);
    }

});


const sppToggleBtn = document.getElementById('sppNavToggle');
const sppSideMenu = document.getElementById('sppMobileMenu');

if (sppToggleBtn) {
    sppToggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Menu open/close toggle
        sppSideMenu.classList.toggle('spp-is-active');
        // Burger to X animation toggle
        this.classList.toggle('spp-cross-icon');
    });
}

// Scroll panna menu close aagi, Burger normal-ah maaridum
window.addEventListener('scroll', () => {
    if (sppSideMenu.classList.contains('spp-is-active')) {
        sppSideMenu.classList.remove('spp-is-active');
        sppToggleBtn.classList.remove('spp-cross-icon'); // Reset to burger icon
    }
});

// Outside click panna close aagurathuku
document.addEventListener('click', (event) => {
    if (!sppSideMenu.contains(event.target) && !sppToggleBtn.contains(event.target)) {
        sppSideMenu.classList.remove('spp-is-active');
        sppToggleBtn.classList.remove('spp-cross-icon'); // Reset to burger icon
    }
});