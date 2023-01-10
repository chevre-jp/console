var eventId = '';

$(function () {
    eventId = $('input[name="id"]').val();

    $('.btn-ok').on('click', function () {
        // 新規追加の場合スケジュール存在確認なし
        if (eventId === undefined) {
            submit();

            return;
        }

        // 登録済スケジュールの存在を確認        
        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/trips/' + eventId + '/events',
            cache: false,
            type: 'GET',
            data: {
                // 件数を確認したいだけなので1件で十分
                limit: 1
            }
        }).done(function (data) {
            var confirmed = false;
            if (data.totalCount > 0) {
                if (window.confirm('登録済スケジュールが存在します。本当に変更しますか？')) {
                    confirmed = true;
                }
            } else {
                confirmed = true;
            }

            if (confirmed) {
                submit();
            }
        }).fail(function (jqxhr, textStatus, error) {
            alert('スケジュールを検索できませんでした');
        }).always(function () {
        });
    });

    /**
     * フォームをsubmitする
     */
    function submit() {
        $('.btn-ok').addClass('disabled')
            .text('processing...');

        $('form').submit();
    }

    var additionalPropertyNameSelection = $('.additionalPropertyNameSelection');
    additionalPropertyNameSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/additionalProperties/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: { identifier: 'BusTrip' }
                }

                // Query parameters will be ?search=[term]&type=public
                return query;
            },
            delay: 250, // wait 250 milliseconds before triggering the request
            // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
            processResults: function (data) {
                // movieOptions = data.data;

                // Transforms the top-level key of the response object from 'items' to 'results'
                return {
                    results: data.results.map(function (additionalProperty) {
                        return {
                            id: additionalProperty.codeValue,
                            text: additionalProperty.codeValue + ' (' + additionalProperty.name.ja + ')'
                        }
                    })
                };
            }
        }
    });

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    });

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
            url: '/projects/' + PROJECT_ID + '/trips/' + eventId,
            type: 'DELETE'
        })
            .done(function () {
                alert('削除しました');
                location.href = '/projects/' + PROJECT_ID + '/trips';
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
