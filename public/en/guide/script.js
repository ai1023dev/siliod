$(window.location.hash).css('color', '#3393ff');

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
        alert('서버 측 에러')
    }
});

$('li').click(function () {
    $('.title').css('color', '#444')
    $($(this).children('a').attr('href')).css('color', '#3393ff')
})