$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);
            $(".balance-amount").text(data.amount + 'p');
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('Server error')
    }
});

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatAmount(amount) {
    return amount.toLocaleString('en-US');
}

$.ajax({
    method: 'GET',
    url: '/receipt',
    success: function (data) {
        console.log(data)
        const $container = $('.receipt-container');

        data.forEach(item => {
            const html = `
                <div class="receipt">
                    <div>${formatDate(item.date)}</div>
                    <div class="receipt-bottom">
                        <span class="point">${item.point}p</span>
                        <span>${formatAmount(item.amount)} ${item.currency}</span>
                    </div>
                </div>
            `;
            $container.prepend(html);
        });
    },
    error: function (xhr, status, error) {
        alert('Server error')
    }
});


$('.logout').click(function () {
    $.ajax({
        method: 'GET',
        url: 'logout',
        success: function (data) {
            window.location.href = '/';
        },
        error: function (xhr, status, error) {
            alert('Server error')
        }
    });
});