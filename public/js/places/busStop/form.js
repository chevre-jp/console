var placeId = '';

$(function () {
    placeId = $('input[name="id"]').val();

    $('.btn-ok').on('click', function () {
        $(this).addClass('disabled')
            .text('processing...');
        $('form').submit();
    });
    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    // 削除ボタン
    $('.btn-delete').on('click', remove);
});

/**
 * 削除
 */
function remove() {
    if (window.confirm('元には戻せません。本当に削除しますか？')) {
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/places/busStop/' + placeId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/places/busStop';
            })
            .fail(function (jqxhr, textStatus, error) {
                var message = '削除できませんでした';
                if (jqxhr.responseJSON != undefined && jqxhr.responseJSON.error != undefined) {
                    message += ': ' + jqxhr.responseJSON.error.message;
                }
                alert(message);
            })
            .always(function () {
            });
    }
}
