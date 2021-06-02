var conditions = {};

$(function () {
    var ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    //Enter押下で検索
    $('form.search').on('keydown', function () {
        if (window.event.keyCode == 13) $('.btn-ok').click();
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    // 検索ボタンイベント
    $(document).on('click', '.btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form.search');
        // 検索API呼び出し
        search(1);
    });

    $('.btn-ok').click();

    // 属性を詳しく見る
    $(document).on('click', '.showAttribute', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAttribute(id, $(this).attr('data-attribute'));
    });
});

function showAttribute(id, attribute) {
    var action = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (action === undefined) {
        alert('アクション' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-action');
    var div = $('<div>')

    div.append($('<textarea>')
        .val(JSON.stringify(action[attribute], null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').text(attribute);
    modal.find('.modal-body').html(div);
    modal.modal();
}

function initializeView() {
    // $('.btn-cancel').addClass('disabled');
    // $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * アクション検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/tasks/search';
    $.ajax({
        dataType: 'json',
        url: url,
        cache: false,
        type: 'GET',
        data: conditions,
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        if (data.success) {
            var dataCount = (data.count) ? (data.count) : 0;
            // 一覧表示
            if ($.CommonMasterList.bind(data.results, dataCount, pageNumber)) {
                $('#list').show();
            } else {
                $('#list').hide();
            }
        }
    }).fail(function (jqxhr, textStatus, error) {
        alert(error);
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}
