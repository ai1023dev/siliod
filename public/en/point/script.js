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
        alert('서버 측 에러')
    }
});



$('.point-card').click(function () {
    $('.point-card').removeClass('select');
    $(this).addClass('select');

    const grade = $('.custom-select').val()
    const point = $(this).attr('data-field')
    
    $('#explanation-point').text(`${ $(this).attr('data-field') }p 충전시`)
    $('#explanation-time').text(`인스턴스 ${ parseFloat((point / grade).toFixed(2)) }시간 사용 가능`)

    $('.move-pay').attr('href', '/pay?point=' + point)
})

$('.custom-select').change(function () {
    const grade = $(this).val()
    const point = $('.select').attr('data-field')
    
    $('#explanation-point').text(`${ $('.select').attr('data-field') }p 충전시`)
    $('#explanation-time').text(`인스턴스 ${ parseFloat((point / grade).toFixed(2)) }시간 사용 가능`)
})