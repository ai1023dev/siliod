$.ajax({
    method: 'GET',
    url: '/login_check',
    success: function (data) {
        console.log(data)
        if (data) {
            $(".avatar").attr('src', data.avatar_url);
            $(".username").text(data.name);
            $(".balance-amount").text(data.amount+'p');
        } else {
            $(".login-modal-backdrop").removeClass("hidden");
        }
    },
    error: function (xhr, status, error) {
        alert('Server-side error')
    }
});



$('.point-card').click(function () {
    $('.point-card').removeClass('select');
    $(this).addClass('select');

    const grade = $('.custom-select').val()
    const point = $(this).attr('data-field')
    
    $('#explanation-point').text(`When charging ${$(this).attr('data-field')} points`)
    $('#explanation-time').text(`Instance can be used for ${parseFloat((point / grade).toFixed(2))} hours`)

    $('.move-pay').attr('href', '/pay?point=' + point)
})

$('.custom-select').change(function () {
    const grade = $(this).val()
    const point = $('.select').attr('data-field')
    
    $('#explanation-point').text(`When charging ${$('.select').attr('data-field')} points`)
    $('#explanation-time').text(`Instance can be used for ${parseFloat((point / grade).toFixed(2))} hours`)
})