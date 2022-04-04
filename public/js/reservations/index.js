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

    $(document).on('click', '.showReservation', function (event) {
        var id = $(this).attr('data-id');

        showReservation(id);
    });

    $(document).on('click', '.showPrice', function (event) {
        var id = $(this).attr('data-id');

        showPrice(id);
    });

    $(document).on('click', '.showUnderName', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing underName...id:', id);

        showUnderName(id);
    });

    $(document).on('click', '.showSubReservation', function (event) {
        var id = $(this).attr('data-id');

        showSubReservation(id);
    });

    $(document).on('click', '.editAdditionalTicketText', function (event) {
        var id = $(this).attr('data-id');

        editAdditionalTicketText(id);
    });

    // 追加特性を見る
    $(document).on('click', '.showAdditionalProperty', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing additionalProperty...id:', id);

        showAdditionalProperty(id);
    });

    // 使用アクション検索
    $(document).on('click', '.showUseActions', function (event) {
        event.preventDefault();
        var id = $(this).attr('data-id');
        showUseActions(id);
    });

    // キャンセルボタンイベント
    $(document).on('click', '.btn-cancel', function () {
        cancelReservations();
    });

    $(document).on('change', 'input[name="selectedReservations"]', function () {
        var selectedReservations = getSelectedReservations();
        console.log(selectedReservations.length, 'selected');
        var selectedReservationsExist = selectedReservations.length > 0;

        var isAllConfimed = true;
        selectedReservations.forEach(function (selectedReservation) {
            if (selectedReservation.reservationStatus !== 'ReservationConfirmed') {
                isAllConfimed = false;
            }
        });

        if (selectedReservationsExist && isAllConfimed) {
            $('.btn-cancel').removeClass('disabled');
        } else {
            $('.btn-cancel').addClass('disabled');
        }
    });

    // 更新ボタンイベント
    $(document).on('click', '#modal-edit .btn-update', function () {
        update();
    });

    var movieSelection = $('#reservationFor\\[superEvent\\]\\[workPerformed\\]\\[identifier\\]');
    movieSelection.select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/creativeWorks/movie/getlist',
            dataType: 'json',
            data: function (params) {
                var query = {
                    name: params.term
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
                    results: data.results.map(function (movie) {
                        return {
                            id: movie.identifier,
                            text: movie.name
                        }
                    })
                };
            }
        }
    });

    $('#application').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'アプリ選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/applications/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    name: params.term
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
                    results: data.results.map(function (application) {
                        return {
                            id: application.id,
                            text: application.name
                        }
                    })
                };
            }
        }
    });

    $('#admin\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: 'ユーザー選択',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/reservations/searchAdmins',
            dataType: 'json',
            data: function (params) {
                var query = {
                    name: params.term
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
                    results: data.results.map(function (member) {
                        return {
                            id: member.member.id,
                            text: member.member.name
                        }
                    })
                };
            }
        }
    });

    $('#reservationFor\\[superEvent\\]\\[location\\]\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/places/movieTheater/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    name: params.term
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
                    results: data.results.map(function (place) {
                        return {
                            id: place.id,
                            text: place.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#reservedTicket\\[ticketType\\]\\[category\\]\\[id\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: { identifier: 'OfferCategoryType' }
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
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: categoryCode.id,
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $('#programMembershipUsed\\[issuedThrough\\]\\[serviceType\\]\\[codeValue\\]').select2({
        // width: 'resolve', // need to override the changed default,
        placeholder: '選択する',
        allowClear: true,
        ajax: {
            url: '/projects/' + PROJECT_ID + '/categoryCodes/search',
            dataType: 'json',
            data: function (params) {
                var query = {
                    limit: 100,
                    page: 1,
                    name: { $regex: params.term },
                    inCodeSet: { identifier: 'MembershipType' }
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
                    results: data.results.map(function (categoryCode) {
                        return {
                            id: categoryCode.codeValue,
                            text: categoryCode.name.ja
                        }
                    })
                };
            }
        }
    });

    $(document).on('click', '.btn-downloadCSV', function () {
        onClickDownload();
    });
});

function showReservation(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#showModal');
    var title = '予約 `' + reservation.id + '`';

    var underName = reservation.underName;
    var body = $('<dl>').addClass('row');
    if (underName !== undefined && underName !== null) {
        body.append($('<dt>').addClass('col-md-3').append('ID'))
            .append($('<dd>').addClass('col-md-9').append(reservation.id))
            .append($('<dt>').addClass('col-md-3').append('予約番号'))
            .append($('<dd>').addClass('col-md-9').append(reservation.reservationNumber))
            .append($('<dt>').addClass('col-md-3').append('予約日時'))
            .append($('<dd>').addClass('col-md-9').append(moment(reservation.bookingTime).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')))
            .append($('<dt>').addClass('col-md-3').append('ステータス'))
            .append($('<dd>').addClass('col-md-9').append(reservation.reservationStatus))
            .append($('<dt>').addClass('col-md-3').append('イベントID'))
            .append($('<dd>').addClass('col-md-9').append(reservation.reservationFor.id))
            .append($('<dt>').addClass('col-md-3').append('発券'))
            .append($('<dd>').addClass('col-md-9').append(reservation.checkedIn))
            .append($('<dt>').addClass('col-md-3').append('入場'))
            .append($('<dd>').addClass('col-md-9').append(reservation.attended));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showUnderName(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-reservation');
    var title = '予約 `' + reservation.id + '` チケットホルダー';

    var underName = reservation.underName;
    var body = $('<dl>').addClass('row');
    if (underName !== undefined && underName !== null) {
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('タイプ')))
            .append($('<dd>').addClass('col-md-9').append(underName.typeOf))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('ID')))
            .append($('<dd>').addClass('col-md-9').append(underName.id))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('名称')))
            .append($('<dd>').addClass('col-md-9').append(underName.name))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('メールアドレス')))
            .append($('<dd>').addClass('col-md-9').append(underName.email))
            .append($('<dt>').addClass('col-md-3').append($('<span>').text('電話番号')))
            .append($('<dd>').addClass('col-md-9').append(underName.telephone));
    }

    if (Array.isArray(underName.identifier)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(underName.identifier.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.name),
                $('<td>').text(property.value)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append($('<dt>').addClass('col-md-3').append($('<span>').text('識別子')))
            .append($('<dd>').addClass('col-md-9').html(table));
    } else {
        body.append($('<dt>').addClass('col-md-3').append($('<h6>').text('識別子')))
            .append($('<dd>').addClass('col-md-9').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showSubReservation(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-reservation');
    var title = '予約 `' + reservation.id + '` サブ予約';

    var body = $('<div>');

    if (Array.isArray(reservation.subReservation)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('セクションコード'),
                $('<th>').text('座席コード')
            ])
        ]);
        tbody.append(reservation.subReservation.map(function (property) {
            return $('<tr>').append([
                $('<td>').text(property.reservedTicket.ticketedSeat.seatSection),
                $('<td>').text(property.reservedTicket.ticketedSeat.seatNumber)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append(table);
    } else {
        body.append($('<p>').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showPrice(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-reservation');
    var title = '予約 `' + reservation.id + '` 価格仕様';

    var body = $('<div>');

    if (Array.isArray(reservation.price.priceComponent)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('タイプ'),
                $('<th>').text('名称'),
                $('<th>').text('価格')
            ])
        ]);
        var priceComponent = reservation.price.priceComponent;
        tbody.append(priceComponent.map(function (priceSpec) {
            var priceStr = priceSpec.price + ' ' + priceSpec.priceCurrency;
            if (priceSpec.referenceQuantity !== undefined) {
                priceStr += ' / ' + priceSpec.referenceQuantity.value + ' ' + priceSpec.referenceQuantity.unitCode;
            }
            return $('<tr>').append([
                $('<td>').text(priceSpec.typeOf),
                $('<td>').text(priceSpec.name.ja),
                $('<td>').text(priceStr)
            ]);
        }));
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);
        body.append(table);
    } else {
        body.append($('<p>').text('なし'));
    }

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function showAdditionalProperty(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-reservation');
    var div = $('<div>')

    if (Array.isArray(reservation.additionalProperty)) {
        var thead = $('<thead>').addClass('text-primary');
        var tbody = $('<tbody>');
        thead.append([
            $('<tr>').append([
                $('<th>').text('Name'),
                $('<th>').text('Value')
            ])
        ]);
        tbody.append(reservation.additionalProperty.map(function (property) {
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

function showUseActions(id) {
    $.ajax({
        dataType: 'json',
        url: '/projects/' + PROJECT_ID + '/reservations/' + id + '/actions/use',
        cache: false,
        type: 'GET',
        // data: conditions,
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (actions) {
        var modal = $('#modal-reservation');

        var thead = $('<thead>').addClass('text-primary')
            .append([
                $('<tr>').append([
                    $('<th>').text('typeOf'),
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

                if (timeline.location !== undefined) {
                    description += '<a href="javascript:void(0)">'
                        + '<span>' + timeline.location.name + '</span>'
                        + '</a> で';
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
                    $('<td>').text(action.typeOf),
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

        modal.find('.modal-title').text('入場アクション');
        modal.find('.modal-body').html(div);
        modal.modal();
    }).fail(function (jqxhr, textStatus, error) {
        alert(error);
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function initializeView() {
    $('.btn-cancel').addClass('disabled');

    $('input[name="selectedReservations"]:checked').prop('checked', false);
}

/**
 * 予約検索
 */
function search(pageNumber) {
    initializeView();

    conditions['page'] = pageNumber;
    var url = '/projects/' + PROJECT_ID + '/reservations/search';
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

function getSelectedReservations() {
    var selectedReservationBoxes = $('input[name="selectedReservations"]:checked');

    var selectedReservationIds = [];
    selectedReservationBoxes.each(function () {
        selectedReservationIds.push($(this).val());
    });

    var selectedReservations = $.CommonMasterList.getDatas()
        .filter(function (data) {
            return selectedReservationIds.indexOf(data.id) >= 0;
            // }).filter(function (data) {
            //     return data.reservationStatus === 'ReservationConfirmed';
        });

    return selectedReservations;
}

function cancelReservations() {
    var selectedReservations = getSelectedReservations();

    var isAllConfimed = true;
    selectedReservations.forEach(function (selectedReservation) {
        if (selectedReservation.reservationStatus !== 'ReservationConfirmed') {
            isAllConfimed = false;
        }
    });
    if (!isAllConfimed) {
        alert('確定予約のみキャンセル可能です');

        return;
    }

    var ids = selectedReservations.map(function (r) {
        return r.id;
    });

    // キャンセルしようとしている予約のステータス
    var reservationNodes = ids.map(function (id) {
        return $('tr[data-id="' + id + '"]', $.CommonMasterList.getListBody());
    });

    var confirmed = false;
    if (window.confirm(ids + 'をキャンセルしますか？')) {
        confirmed = true;
    }

    if (confirmed) {
        var url = '/projects/' + PROJECT_ID + '/reservations/cancel';
        $.ajax({
            dataType: 'json',
            url: url,
            cache: false,
            type: 'POST',
            data: { ids: ids },
            beforeSend: function () {
                reservationNodes.forEach(function (reservationNode) {
                    $('.reservationStatusTypeName', reservationNode).text('更新中...');
                });

                $('#loadingModal').modal({ backdrop: 'static' });
            }
        }).done(function (data) {
            $.notify({
                message: 'キャンセルしました'
            }, {
                type: 'success'
            });
            $('.btn-cancel').addClass('disabled');
            $('input[name="selectedReservations"]:checked').prop('checked', false);

            // 表示ステータス変更
            reservationNodes.forEach(function (reservationNode) {
                $('.reservationStatusTypeName', reservationNode).text('キャンセル済');
            });
        }).fail(function (jqxhr, textStatus, error) {
            console.error(error);
            $.notify({
                message: 'キャンセルできませんでした' + error
            }, {
                type: 'danger'
            });
        }).always(function (data) {
            $('#loadingModal').modal('hide');
        });
    }
}

function editAdditionalTicketText(id) {
    var reservation = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (reservation === undefined) {
        alert('予約' + id + 'が見つかりません');

        return;
    }

    var modal = $('#modal-edit');
    var title = '予約 `' + reservation.id + '` 追加テキスト';

    var body = $('<form>').addClass('edit');
    body.append(
        $('<input>')
            .attr({
                type: 'hidden',
                name: 'id',
                value: reservation.id
            })
    ).append(
        $('<input>')
            .addClass('form-control')
            .attr({
                type: 'text',
                name: 'additionalTicketText',
                value: reservation.additionalTicketText
            })
    );

    modal.find('.modal-title').html(title);
    modal.find('.modal-body').html(body);
    modal.modal();
}

function update() {
    var modal = $('#modal-edit');

    var id = $('input[name="id"]', modal).val();

    console.log('updating...', id, $('form.edit').serialize());

    var url = '/projects/' + PROJECT_ID + '/reservations/' + id;
    $.ajax({
        dataType: 'json',
        url: url,
        cache: false,
        type: 'PATCH',
        data: $('form.edit').serialize(),
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    })
        .done(function (data) {
            $.notify({
                message: '変更しました'
            }, {
                type: 'success'
            });
            modal.modal('hide');
            search(1);
        })
        .fail(function (xhr, textStatus, error) {
            var message = error;
            try {
                var res = xhr.responseJSON;
                if (typeof res.message === 'string') {
                    message = res.message;
                }
            } catch (e) {
            }

            alert('変更できませんでした: ' + message);
        })
        .always(function (data) {
            $('#loadingModal').modal('hide');
        });
}

async function onClickDownload() {
    var conditions4csv = $.fn.getDataFromForm('form.search');

    console.log('downloaing...');
    // this.utilService.loadStart({ process: 'load' });
    var notify = $.notify({
        // icon: 'fa fa-spinner',
        message: 'ダウンロードを開始します...',
    }, {
        type: 'primary',
        delay: 200,
        newest_on_top: true
    });
    var limit4download = 50;

    const datas = [];
    let page = 0;
    while (true) {
        page += 1;
        conditions4csv.page = page;
        console.log('searching reports...', limit4download, page);
        var notifyOnSearching = $.notify({
            message: page + 'ページ目を検索しています...',
        }, {
            type: 'primary',
            delay: 200,
            newest_on_top: true
        });

        // 全ページ検索する
        var searchResult = undefined;
        var searchError = { message: 'unexpected error' };
        // retry some times
        var tryCount = 0;
        const MAX_TRY_COUNT = 3;
        while (tryCount < MAX_TRY_COUNT) {
            try {
                tryCount += 1;

                searchResult = await new Promise((resolve, reject) => {
                    $.ajax({
                        url: '/projects/' + PROJECT_ID + '/reservations/search',
                        cache: false,
                        type: 'GET',
                        dataType: 'json',
                        data: {
                            ...conditions4csv,
                            limit: limit4download
                        },
                        // data: {
                        //     // limit,
                        //     page,
                        //     format: 'datatable'
                        // }
                        beforeSend: function () {
                            $('#loadingModal').modal({ backdrop: 'static' });
                        }
                    }).done(function (result) {
                        console.log('searched.', result);
                        resolve(result);
                    }).fail(function (xhr) {
                        var res = { error: { message: '予期せぬエラー' } };
                        try {
                            var res = $.parseJSON(xhr.responseText);
                            console.error(res.error);
                        } catch (error) {
                            // no op                    
                        }
                        reject(new Error(res.error.message));
                    }).always(function () {
                        $('#loadingModal').modal('hide');
                        notifyOnSearching.close();
                    });
                });

                break;
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
                searchError = error;
            }
        }

        if (searchResult === undefined) {
            alert('ダウンロードが中断されました。再度お試しください。' + searchError.message);

            return;
        }

        if (Array.isArray(searchResult.results)) {
            datas.push(...searchResult.results.map(function (reservation) {
                return reservation2report({ reservation });
            }));
        }

        if (searchResult.results.length < limit4download) {
            break;
        }
    }

    console.log(datas.length, 'reports found');
    $.notify({
        message: datas.length + '件の予約が見つかりました',
    }, {
        type: 'primary',
        delay: 2000,
        newest_on_top: true
    });

    const fields = [
        { label: 'ID', default: '', value: 'id' },
        { label: '予約番号', default: '', value: 'reservationNumber' },
        { label: '予約ステータス', default: '', value: 'reservationStatus' },
        { label: '追加チケットテキスト', default: '', value: 'additionalTicketText' },
        { label: '予約日時', default: '', value: 'bookingTime' },
        { label: '更新日時', default: '', value: 'modifiedTime' },
        { label: '座席数', default: '', value: 'numSeats' },
        { label: '発券済', default: '', value: 'checkedIn' },
        { label: '入場済', default: '', value: 'attended' },
        { label: 'イベントID', default: '', value: 'reservationFor.id' },
        { label: 'イベント名称', default: '', value: 'reservationFor.name' },
        { label: 'イベント開始日時', default: '', value: 'reservationFor.startDate' },
        { label: 'イベント終了日時', default: '', value: 'reservationFor.endDate' },
        { label: '座席番号', default: '', value: 'reservedTicket.ticketedSeat.seatNumber' },
        { label: '座席セクション', default: '', value: 'reservedTicket.ticketedSeat.seatSection' },
        { label: '予約者タイプ', default: '', value: 'underName.typeOf' },
        { label: '予約者ID', default: '', value: 'underName.id' },
        { label: '予約者名称', default: '', value: 'underName.name' },
        { label: '予約者名', default: '', value: 'underName.givenName' },
        { label: '予約者性', default: '', value: 'underName.familyName' },
        { label: '予約者メールアドレス', default: '', value: 'underName.email' },
        { label: '予約者電話番号', default: '', value: 'underName.telephone' },
        { label: '予約者性別', default: '', value: 'underName.gender' },
        { label: '予約者住所', default: '', value: 'underName.address' },
        { label: '予約者年齢', default: '', value: 'underName.age' },
        { label: '予約者説明', default: '', value: 'underName.description' },
        { label: '予約者識別子', default: '', value: 'underName.identifier' }
    ];
    const opts = {
        fields: fields,
        delimiter: ',',
        eol: '\n',
        // flatten: true,
        // preserveNewLinesInValues: true,
        // unwind: 'acceptedOffers'
    };

    const parser = new json2csv.Parser(opts);
    var csv = parser.parse(datas);
    const blob = string2blob(csv, { type: 'text/csv' });
    const fileName = 'reservations.csv';
    download(blob, fileName);

    return false;
}

/**
 * 文字列をBLOB変換
 */
function string2blob(value, options) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, value], options);
}

function download(blob, fileName) {
    if (window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, fileName);
        window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }
}

function reservation2report(params) {
    const reservation = params.reservation;

    return {
        id: String(reservation.id),
        additionalTicketText: (typeof reservation.additionalTicketText === 'string') ? reservation.additionalTicketText : '',
        bookingTime: moment(reservation.bookingTime)
            .toISOString(),
        modifiedTime: moment(reservation.modifiedTime)
            .toISOString(),
        numSeats: String(reservation.numSeats),
        reservationFor: (reservation.reservationFor !== undefined && reservation.reservationFor !== null)
            ? {
                id: String(reservation.reservationFor.id),
                name: String(reservation.reservationFor.name.ja),
                startDate: moment(reservation.reservationFor.startDate)
                    .toISOString(),
                endDate: moment(reservation.reservationFor.endDate)
                    .toISOString()
            }
            : {
                id: '',
                name: '',
                startDate: '',
                endDate: ''
            },
        reservationNumber: String(reservation.reservationNumber),
        reservationStatus: String(reservation.reservationStatus),
        reservedTicket: (reservation.reservedTicket !== undefined
            && reservation.reservedTicket !== null
            && reservation.reservedTicket.ticketedSeat !== undefined
            && reservation.reservedTicket.ticketedSeat !== null
        )
            ? {
                ticketedSeat: {
                    seatNumber: String(reservation.reservedTicket.ticketedSeat.seatNumber),
                    seatSection: String(reservation.reservedTicket.ticketedSeat.seatSection)
                }
            }
            : {
                ticketedSeat: {
                    seatNumber: '',
                    seatSection: ''
                }
            },
        underName: (reservation.underName !== undefined && reservation.underName !== null)
            ? {
                typeOf: (typeof reservation.underName.typeOf === 'string') ? String(reservation.underName.typeOf) : '',
                name: (typeof reservation.underName.name === 'string') ? String(reservation.underName.name) : '',
                address: (typeof reservation.underName.address === 'string') ? String(reservation.underName.address) : '',
                age: (typeof reservation.underName.age === 'string') ? String(reservation.underName.age) : '',
                description: (typeof reservation.underName.description === 'string') ? String(reservation.underName.description) : '',
                email: (typeof reservation.underName.email === 'string') ? String(reservation.underName.email) : '',
                familyName: (typeof reservation.underName.familyName === 'string') ? String(reservation.underName.familyName) : '',
                gender: (typeof reservation.underName.gender === 'string') ? String(reservation.underName.gender) : '',
                givenName: (typeof reservation.underName.givenName === 'string') ? String(reservation.underName.givenName) : '',
                id: (typeof reservation.underName.id === 'string') ? String(reservation.underName.id) : '',
                identifier: (Array.isArray(reservation.underName.identifier)) ? JSON.stringify(reservation.underName.identifier) : '',
                telephone: (typeof reservation.underName.telephone === 'string') ? String(reservation.underName.telephone) : ''
            }
            : {
                typeOf: '',
                name: '',
                address: '',
                age: '',
                description: '',
                email: '',
                familyName: '',
                gender: '',
                givenName: '',
                id: '',
                identifier: '',
                telephone: ''
            },
        checkedIn: (typeof reservation.checkedIn === 'boolean') ? reservation.checkedIn : false,
        attended: (typeof reservation.attended === 'boolean') ? reservation.attended : false
    };
}
