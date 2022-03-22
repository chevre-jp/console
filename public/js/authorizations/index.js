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

    $(document).on('click', '.showObject', function (event) {
        var id = $(this).attr('data-id');

        showObject(id);
    });

    $(document).on('click', '.showActions', function (event) {
        var id = $(this).attr('data-id');

        showActionsById(id);
    });
});

function showObject(id) {
    var authorization = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (authorization === undefined) {
        alert('承認' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-authorization');
    var title = '承認 `' + authorization.code + '` 承認対象';

    var body = $('<div>');

    body.append($('<textarea>')
        .val(JSON.stringify(authorization.object, null, '\t'))
        .addClass('form-control')
        .attr({
            rows: '25',
            disabled: ''
        })
    );

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showActionsById(id) {
    var authorization = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (authorization === undefined) {
        alert(id + 'が見つかりません');

        return;
    }

    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/authorizations/' + authorization.id + '/actions',
        cache: false,
        type: 'GET',
        data: { limit: 50, page: 1 },
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        showActions(authorization, data);
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function showActions(authorization, actions) {
    var modal = $('#modal-authorization');

    var thead = $('<thead>').addClass('text-primary')
        .append([
            $('<tr>').append([
                $('<th>').text('タイプ'),
                $('<th>').text('開始'),
                $('<th>').text('ステータス'),
                $('<th>').text('説明')
            ])
        ]);
    var tbody = $('<tbody>')
        .append(actions.map(function (action) {
            var timeline = action.timeline;

            var description = '<a href="javascript:void(0)">' + timeline.agent.name
                + '</a>が';

            if (timeline.recipient !== undefined) {
                var recipientName = String(timeline.recipient.name);
                if (recipientName.length > 40) {
                    recipientName = String(timeline.recipient.name).slice(0, 40) + '...';
                }
                description += '<a href="javascript:void(0)">'
                    + '<span>' + recipientName + '</span>'
                    + '</a> に';
            }

            if (timeline.purpose !== undefined) {
                description += '<a href="javascript:void(0)">'
                    + '<span>' + timeline.purpose.name + '</span>'
                    + '</a> のために';
            }

            description += '<a href="javascript:void(0)">'
                + '<span>' + timeline.object.name + '</span>'
                + '</a> を'
                + '<span>' + timeline.actionName + '</span>'
                + '<span>' + timeline.actionStatusDescription + '</span>';

            return $('<tr>').append([
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light'].join(' '))
                        .text(action.typeOf)
                ),
                $('<td>').text(action.startDate),
                $('<td>').html(
                    $('<span>')
                        .addClass(['badge', 'badge-light', action.actionStatus].join(' '))
                        .text(action.actionStatus)
                ),
                $('<td>').html(description)
            ]);
        }))
    var table = $('<table>').addClass('table table-sm')
        .append([thead, tbody]);

    var div = $('<div>')
        .append($('<div>').addClass('table-responsive').append(table));

    modal.find('.modal-title').text('アクション');
    modal.find('.modal-body').html(div);
    modal.modal();
}

function initializeView() {
    $('.btn-cancel').addClass('disabled');

    $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * 検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/authorizations/search';
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
