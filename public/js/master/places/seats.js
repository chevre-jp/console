$(function () {
    var ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    })

    //Enter押下で検索
    $('form').on('keydown', function () {
        if (window.event.keyCode == 13) $('.btn-ok').click();
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    // 検索ボタンイベント
    var conditions = {};
    $(document).on('click', '.btn-ok', function () {
        // 検索条件取得
        conditions = $.fn.getDataFromForm('form');
        // 検索API呼び出し
        search(1);
    });

    var screenBranchCodeSelection = $('#screenBranchCode');
    screenBranchCodeSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'ルーム選択',
        allowClear: true,
        ajax: {
            url: '/places/screeningRoom/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 20,
                    page: 1,
                    name: { $regex: params.term }
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
                    results: data.results.map(function (screeningRoom) {
                        return {
                            id: screeningRoom.branchCode,
                            text: screeningRoom.branchCode + ' ' + screeningRoom.name.ja
                        }
                    })
                };
            }
        }
    });

    var screeningRoomSectionBranchCodeSelection = $('#screeningRoomSectionBranchCode');
    screeningRoomSectionBranchCodeSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'セクション選択',
        allowClear: true,
        ajax: {
            url: '/places/screeningRoomSection/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 20,
                    page: 1,
                    name: { $regex: params.term }
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
                    results: data.results.map(function (screeningRoomSection) {
                        return {
                            id: screeningRoomSection.branchCode,
                            text: screeningRoomSection.branchCode + ' ' + screeningRoomSection.name.ja
                        }
                    })
                };
            }
        }
    });

    $('.btn-ok').click();

    //--------------------------------
    // 検索API呼び出し
    //--------------------------------
    function search(pageNumber) {
        conditions['page'] = pageNumber;
        var url = '/places/seat/search';
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
            alert("fail");
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAdditionalProperty(id);
    });

    /**
     * 追加特性を見る
     */
    function showAdditionalProperty(id) {
        var seat = $.CommonMasterList.getDatas().find(function (data) {
            return data.id === id
        });
        if (seat === undefined) {
            alert('座席' + id + 'が見つかりません');

            return;
        }

        var modal = $('#modal-additionalProperty');
        var div = $('<div>')

        if (Array.isArray(seat.additionalProperty)) {
            var thead = $('<thead>').addClass('text-primary');
            var tbody = $('<tbody>');
            thead.append([
                $('<tr>').append([
                    $('<th>').text('Name'),
                    $('<th>').text('Value')
                ])
            ]);
            tbody.append(seat.additionalProperty.map(function (property) {
                return $('<tr>').append([
                    $('<td>').text(property.name),
                    $('<td>').text(property.value)
                ]);
            }));
            var table = $('<table>').addClass('table table-sm')
                .append([thead, tbody]);
            div.addClass('table-responsive')
                .append(table);
        } else {
            div.append($('<p>').addClass('description text-center').text('データが見つかりませんでした'));
        }

        modal.find('.modal-title').text('追加特性');
        modal.find('.modal-body').html(div);
        modal.modal();
    }
});
