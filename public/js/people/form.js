var userId = '';

$(function () {
    userId = $('input[name="id"]').val();
    console.log('userId:', userId);

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');

        $('form').submit();
    });

    if ($('.datepicker').length > 0) {
        $('.datepicker').datepicker({ language: 'ja' });
    }
    // if ($('.datetimepicker').length > 0) {
    //     $('.datetimepicker').datetimepicker({
    //         locale: 'ja',
    //         format: 'YYYY-MM-DDTHH:mm:ss+09:00'
    //     });
    // }

    // 削除ボタン
    $('.btn-delete').on('click', deleteById);
});
