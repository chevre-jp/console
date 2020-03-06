/**
 * スケジュール作成中かどうか
 */
var creatingSchedules = false;

var scheduler;
var ITEMS_ON_PAGE;
var conditions = {};
var SEARCH_URL = '/events/screeningEvent/search';

$(function () {
    ITEMS_ON_PAGE = Number($('input[name="limit"]').val());

    //上映日
    $('.search form input[name=date], #newModal input[name="screeningDateStart"], #newModal input[name="screeningDateThrough"]')
        .val(moment().tz('Asia/Tokyo').format('YYYY/MM/DD'));

    // timepickerセット
    if ($('.timepicker').length > 0) {
        $('.timepicker').timepicker({
            step: 5,
            timeFormat: 'H:i',
            // interval: 60,
            // minTime: '10',
            // maxTime: '6:00pm',
            // defaultTime: '11',
            // startTime: '10:00',
            // dynamic: false,
            // dropdown: true,
            // scrollbar: true
        })
    }

    // datepickerセット
    $('.datepicker').datepicker({
        language: 'ja'
    });

    // 共通一覧表示初期セット・ページャセット
    $.CommonMasterList.init('#templateRow', '#searchedCount');
    $.CommonMasterList.pager('#pager', ITEMS_ON_PAGE, function (pageNumber) {
        search(pageNumber);
    });

    //スケジューラー初期化
    scheduler = createScheduler();

    // スクリーン選択肢初期化
    getScreens($('.search select[name="theater"]').val(), 'none');

    searchSchedule();

    // 検索
    $(document).on('click', '.search-button', searchSchedule);
    // 新規作成
    $(document).on('click', '.add-button', add);

    // 新規登録（確定）
    $(document).on('click', '.regist-button', regist);

    // 更新（確定）
    $(document).on('click', '.update-button', update);

    // 削除ボタンの処理
    $(document).on('click', '.delete-button', deletePerformance);

    // 絶対・相対切り替え
    $(document).on('change', 'input[name=onlineDisplayType], input[name=saleStartDateType]', changeInputType)

    // 劇場検索条件変更イベント
    $(document).on('change', '.search select[name="theater"]', _.debounce(function () {
        var theater = $(this).val();
        getScreens(theater, 'none');
    }, 500));

    $(document).on('change', '#newModal select[name="screeningEventSeriesId"]', function () {
        var mvtkFlg = $(this).find('option:selected').attr('data-mvtk-flag');
        if (mvtkFlg != 1) {
            $('#newModal input[name=mvtkExcludeFlg]').removeAttr('checked');
            $('#newModal .mvtk').hide();
        } else {
            $('#newModal .mvtk').show();
        }
    });

    $(document).on('change', '#newModal select[name="theater"]', _.debounce(function () {
        var theater = $(this).val();
        getScreens(theater, 'add');
        getEventSeries(theater);
    }, 500));

    $(document).on('change', '.search input[name="date"]', _.debounce(function () {
        var theater = $('.search select[name=theater]').val();
        var date = $(this).val();
        getEventSeries(theater, date);
    }, 500));

    var target = [
        'input[name="doorTime"]',
        'input[name="startTime"]',
        'input[name="endTime"]',
        'select[name="ticketTypeGroup"]'
    ];
    $(document).on(
        'change',
        target.join(', '),
        function () {
            $(this).parents('.timeTable').attr('data-dirty', true);
        }
    );

    // COAイベントインポート
    $(document).on('click', 'a.importFromCOA', function (event) {
        var theater = $('.search select[name=theater]').val();
        if (!theater) {
            alert('劇場を選択してください');

            return;
        }

        var message = '劇場:' + theater + 'のCOAイベントをインポートしようとしています。'
            + '\nよろしいですか？';

        if (window.confirm(message)) {
            $.ajax({
                url: '/events/screeningEvent/importFromCOA',
                type: 'POST',
                dataType: 'json',
                data: $('.search form').serialize()
            }).done(function (tasks) {
                console.log(tasks);
                alert('インポートを開始しました');
            }).fail(function (xhr) {
                var res = $.parseJSON(xhr.responseText);
                alert(res.error.message);
            }).always(function () {
            });
        } else {
        }
    });

    $(document).on('click', '.showOffers', function (event) {
        var id = $(this).attr('data-id');
        console.log('showing offers...id:', id);

        showOffers(id);
    });

    $(document).on('click', '.editPerformance', function (event) {
        var id = $(this).attr('data-id');
        console.log('editing...id:', id);

        editPerformance(id);
    });
});

/**
 * イベントシリーズ取得
 * @function getEventSeries
 * @param {date}
 * @returns {void}
 */
function getEventSeries(theater) {
    if (!theater) {
        return;
    }
    var screeningEventSeriesSelect = $('#newModal select[name="screeningEventSeriesId"]');
    screeningEventSeriesSelect.html('<option selected disabled>-----</option>')
    $.ajax({
        dataType: 'json',
        url: '/events/screeningEventSeries/search',
        type: 'GET',
        data: {
            locationId: theater
        }
    }).done(function (data) {
        if (data && data.success) {
            // console.log(data);
            var screeningEventSeries = data.results;
            var options = screeningEventSeries.map(function (e) {
                return '<option value="' + e.id + '"'
                    + ' data-mvtk-flag="' + e.mvtkFlg + '"'
                    + ' data-startDate="' + e.startDate + '"'
                    + ' data-endDate="' + e.endDate + '"'
                    + '>' + e.filmNameJa + '</option>';
            });
            options.unshift('<option value="" disabled selected>選択してください</option>')
            screeningEventSeriesSelect.html(options);
        }
    }).fail(function (jqxhr, textStatus, error) {
        alert('劇場上映作品を検索できませんでした');
    });
}

/**
 * スクリーン取得
 * @function getScreens
 * @param {theater}
 * @param {addModal}
 * @returns {void}
 */
function getScreens(theaterId, modal = 'none') {
    console.log('searching screens...');
    var selectScreen = $('select[name="screen"]');
    if (modal.indexOf('none') >= 0) {
        selectScreen = $('.search select[name="screen"]');
    }
    if (modal.indexOf('edit') >= 0) {
        selectScreen = $('#editModal select[name="screen"]');
    }
    if (modal.indexOf('add') >= 0) {
        selectScreen = $('#newModal select[name="screen"]');
    }
    function resetScreenList() {
        var o = $('<option></option>');
        o.html('劇場を選択してください');
        o.val('');
        selectScreen.html(o);
    }
    if (!theaterId) {
        resetScreenList();
        return;
    } else {
        selectScreen.html('<option selected disabled>-----</option>');
    }
    $.ajax({
        dataType: 'json',
        url: '/places/movieTheater/' + theaterId + '/screeningRooms',
        type: 'GET',
        data: {}
    }).done(function (data) {
        console.log('screens found.', data);
        if (data && data.success) {
            if (modal.indexOf('none') >= 0) {
                selectScreen.html('<option value="">-----</option>');
            } else {
                selectScreen.html('<option value="" disabled selected>選択してください</option>');
            }
            $.each(data.results, function (_, screen) {
                var o = $('<option></option>');
                o.html(screen.branchCode + ' ' + screen.name + ' (' + screen.numSeats + ' seats' + ')');
                o.val(screen.branchCode);
                o.appendTo(selectScreen);
            });
        } else {
            resetScreenList();
        }
    }).fail(function (jqxhr, textStatus, error) {
        alert('スクリーンを検索できませんでした');
    });
}

function getWeekDayData() {
    var weekDayData = $('#newModal input[name="weekDay"]:checked');
    if (weekDayData.length === 0) {
        return [];
    }
    var result = [];
    weekDayData.each(function () {
        result.push($(this).val());
    });
    return result;
}

/**
 * 時間情報を取得
 * @function getTableData
 */
function getTableData() {
    var timeTableData = $('#newModal .timeTable[data-dirty="true"]');
    if (timeTableData.length === 0) {
        // 何も入力していない=>NG
        return {
            ticketData: [],
            timeData: [],
            mvtkExcludeFlgData: []
        };
    }

    var tempData = [];
    timeTableData.each(function (_, row) {
        const mvtkExcludeFlg = $(row).find('input[name="mvtkExcludeFlg"]:checked').val() === undefined ? 0 : 1;
        var o = {
            doorTime: $(row).find('input[name="doorTime"]').val(),
            startTime: $(row).find('input[name="startTime"]').val(),
            endTime: $(row).find('input[name="endTime"]').val(),
            endDayRelative: Number($(row).find('select[name="endDayRelative"]').val()),
            ticketTypeGroup: $(row).find('select[name="ticketTypeGroup"]').val(),
            mvtkExcludeFlg: mvtkExcludeFlg
        };

        // 入力していない情報がある=>NG
        if (
            o.doorTime == null ||
            o.startTime == null ||
            o.endTime == null ||
            o.endDayRelative == null ||
            o.ticketTypeGroup == null
        ) {
            return false;
        }

        if (o.doorTime > o.startTime || (o.endDayRelative === 0 && o.startTime > o.endTime)) {
            alert('開場/開始/終了時刻を確認してください');
            return false;
        }

        tempData.push(o);
    });

    var timeData = tempData.map(function (data) {
        return {
            doorTime: data.doorTime.replace(':', ''),
            startTime: data.startTime.replace(':', ''),
            endTime: data.endTime.replace(':', ''),
            endDayRelative: Number(data.endDayRelative)
        }
    });
    var ticketData = tempData.map(function (data) {
        return data.ticketTypeGroup
    });
    var mvtkExcludeFlgData = tempData.map(function (data) {
        return data.mvtkExcludeFlg
    });

    return {
        ticketData: ticketData,
        timeData: timeData,
        mvtkExcludeFlgData: mvtkExcludeFlgData
    };
}

/**
 * 新規登録（確定）
 * @function register
 * @returns {void}
 */
function regist() {
    // 作成中なら何もしない
    if (creatingSchedules) {
        return;
    }
    creatingSchedules = true;

    var modal = $('#newModal');
    var theater = modal.find('select[name=theater]').val();
    var screen = modal.find('select[name=screen]').val();
    var startDate = modal.find('input[name=screeningDateStart]').val();
    var toDate = modal.find('input[name=screeningDateThrough]').val();
    var screeningEventId = modal.find('select[name=screeningEventSeriesId]').val();

    // 可能であれば登録時に販売開始日を追加
    var saleStartDateType = modal.find('input[name=saleStartDateType]:checked').val();
    var saleStartDate = (saleStartDateType === 'absolute')
        ? modal.find('input[name=saleStartDateAbsolute]').val()
        : (saleStartDateType === 'relative')
            ? modal.find('input[name=saleStartDateRelative]').val()
            : 'default';
    var saleStartTime = (saleStartDateType === 'absolute')
        // ? modal.find('select[name=saleStartDateHour]').val() + modal.find('select[name=saleStartDateMinutes]').val()
        ? modal.find('input[name=saleStartTime]').val().replace(':', '')
        : 'default';

    var onlineDisplayType = modal.find('input[name=onlineDisplayType]:checked').val();
    var onlineDisplayStartDate = (onlineDisplayType === 'absolute')
        ? modal.find('input[name=onlineDisplayStartDateAbsolute]').val()
        : modal.find('input[name=onlineDisplayStartDateRelative]').val();

    var tableData = getTableData();
    console.log('tableData:', tableData);
    var weekDayData = getWeekDayData();
    var reservedSeatsAvailable = modal.find('input[name=reservedSeatsAvailable]:checked').val();

    if (theater === ''
        || screen === null
        || startDate === ''
        || toDate === ''
        || screeningEventId === null
        || tableData.timeData.length === 0
        || tableData.ticketData.length === 0
        || weekDayData.length === 0
        || saleStartDate === ''
        || saleStartTime === ''
        || onlineDisplayStartDate === ''
    ) {
        creatingSchedules = false;
        alert('情報が足りません');
        return;
    }

    var selectedTheater = modal.find('select[name=theater] option:selected');
    var maxSeatNumber = selectedTheater.attr('data-max-seat-number');
    var saleStartDays = selectedTheater.attr('data-sale-start-days');
    var endSaleTimeAfterScreening = selectedTheater.attr('data-end-sale-time');

    if (moment(startDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ') >= moment(toDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'day')) {
        creatingSchedules = false;
        alert('登録期間を正しく設定してください');
        return;
    }

    // 登録期間が興行期間に含まれているかどうか確認
    var eventSeriesStartDate = modal.find('select[name=screeningEventSeriesId]').find('option:selected').attr('data-startDate');
    var eventSeriesEndDate = modal.find('select[name=screeningEventSeriesId]').find('option:selected').attr('data-endDate');
    if (moment(startDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ') < moment(eventSeriesStartDate)
        || moment(toDate + 'T00:00:00+09:00', 'YYYY/MM/DDTHH:mm:ssZ').add(1, 'day') > moment(eventSeriesEndDate)) {
        creatingSchedules = false;
        alert('登録期間を興行期間内に設定してください');
        return;
    }

    if (
        maxSeatNumber === undefined
        || saleStartDays === undefined
        || endSaleTimeAfterScreening === undefined
    ) {
        creatingSchedules = false;
        alert('エラーが発生しました/nページをレフレッシュしてください！');
        return;
    }

    var originalButtonText = $('.regist-button').text();
    $.ajax({
        dataType: 'json',
        url: '/events/screeningEvent/regist',
        type: 'POST',
        data: {
            theater: theater,
            screen: screen,
            screeningEventId: screeningEventId,
            startDate: startDate,
            toDate: toDate,
            weekDayData: weekDayData,
            timeData: tableData.timeData,
            ticketData: tableData.ticketData,
            mvtkExcludeFlgData: tableData.mvtkExcludeFlgData,
            saleStartDateType: saleStartDateType,
            saleStartDate: saleStartDate,
            saleStartTime: saleStartTime,
            onlineDisplayType: onlineDisplayType,
            onlineDisplayStartDate: onlineDisplayStartDate,
            maxSeatNumber: maxSeatNumber,
            saleStartDays: saleStartDays,
            endSaleTimeAfterScreening: endSaleTimeAfterScreening,
            reservedSeatsAvailable: reservedSeatsAvailable
        },
        beforeSend: function () {
            $('.regist-button').prop('disabled', true);
            $('.regist-button').text('登録中...');
        }
    }).done(function (data) {
        if (!data.error) {
            modal.modal('hide');
            if ($('.search select[name=theater]').val() !== theater) {
                getScreens(theater, 'none');
                $('.search select[name=theater]').val(theater);
            }
            searchSchedule();

            creatingSchedules = false;
            return;
        }

        alert('登録に失敗しました');

        creatingSchedules = false;
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
        if (jqxhr.responseJSON != undefined && jqxhr.responseJSON.error != undefined) {
            alert(jqxhr.responseJSON.error);
        } else {
            alert('登録に失敗しました');
        }

        creatingSchedules = false;
    }).always(function () {
        $('.regist-button').prop('disabled', false);
        $('.regist-button').text(originalButtonText);
    });
}

/**
 * 更新（確定）
 * @function update
 * @returns {void}
 */
function update() {
    var modal = $('#editModal');
    var theater = modal.find('input[name=theater]').val();
    var day = modal.find('input[name=day]').val();
    var endDay = modal.find('input[name=endDay]').val();
    var screeningEventId = modal.find('input[name=screeningEventId]').val();
    var performance = modal.find('input[name=performance]').val();
    var screen = modal.find('select[name=screen]').val();
    var doorTime = modal.find('input[name=doorTime]').val().replace(':', '');
    var startTime = modal.find('input[name=startTime]').val().replace(':', '');
    var endTime = modal.find('input[name=endTime]').val().replace(':', '');
    var ticketTypeGroup = modal.find('select[name=ticketTypeGroup]').val();
    var saleStartDate = modal.find('input[name=saleStartDate]').val();
    var saleStartTime = modal.find('input[name=saleStartTime]').val().replace(':', '');
    var onlineDisplayStartDate = modal.find('input[name=onlineDisplayStartDate]').val();
    var maxSeatNumber = modal.find('input[name=maxSeatNumber]').val();
    var mvtkExcludeFlg = modal.find('input[name=mvtkExcludeFlg]:checked').val();
    var reservedSeatsAvailable = modal.find('input[name=reservedSeatsAvailable]').val();

    // 追加特性を収集
    var additionalProperty = [];
    for (let i = 0; i < 10; i++) {
        var additionalPropertyName = modal.find('input[name="additionalProperty[' + i + '][name]"]').val();
        var additionalPropertyValue = modal.find('input[name="additionalProperty[' + i + '][value]"]').val();
        additionalProperty.push({ name: String(additionalPropertyName), value: String(additionalPropertyValue) });
    }

    if (performance === ''
        || screen === ''
        || doorTime === ''
        || startTime === ''
        || endTime === ''
        || endDay === ''
        || ticketTypeGroup === ''
        || saleStartDate === ''
        || saleStartTime === ''
        || onlineDisplayStartDate === '') {
        alert('情報が足りません');
        return;
    }

    // オンライン表示開始日 ≦ 当日を確認
    var performanceBefore = scheduler.editingPerforamce;
    console.log('checking online display start date...', performanceBefore.offers.availabilityStarts);
    var onlineDisplayStartDateBefore = performanceBefore.offers.availabilityStarts;
    var now = moment();
    var confirmed = false;
    if (moment(onlineDisplayStartDateBefore) <= now
        && moment(onlineDisplayStartDate + 'T00:00:00T09:00', 'YYYY/MM/DDTHH:mm:ssZ') > now) {
        if (window.confirm('オンライン表示中のスケジュールが非表示になります。本当に変更しますか？')) {
            confirmed = true;
        }
    } else {
        confirmed = true;
    }

    if (confirmed) {
        $.ajax({
            dataType: 'json',
            url: '/events/screeningEvent/' + performance + '/update',
            type: 'POST',
            data: {
                theater: theater,
                screen: screen,
                day: day,
                endDay: endDay,
                screeningEventId: screeningEventId,
                doorTime: doorTime,
                startTime: startTime,
                endTime: endTime,
                ticketTypeGroup: ticketTypeGroup,
                saleStartDate: saleStartDate,
                saleStartTime: saleStartTime,
                onlineDisplayStartDate: onlineDisplayStartDate,
                maxSeatNumber: maxSeatNumber,
                mvtkExcludeFlg: mvtkExcludeFlg,
                reservedSeatsAvailable: reservedSeatsAvailable,
                additionalProperty: additionalProperty
            }
        }).done(function (data) {
            if (!data.error) {
                modal.modal('hide');
                searchSchedule();
                return;
            }
            alert('更新に失敗しました');
        }).fail(function (jqxhr, textStatus, error) {
            console.error(jqxhr, textStatus, error);
            alert('更新に失敗しました');
        });
    }
}

/**
 * 検索
 */
function searchSchedule() {
    var theater = $('.search select[name=theater]').val();
    getScreens(theater, 'edit');

    var format = $('.search select[name=format]').val();

    switch (format) {
        case 'table':
            $('#scheduler').addClass('d-none');

            search(1);

            break;

        default:
            $('#list').hide();
            $('#datatables_info,#datatables_paginate,#pager').empty();
            $('#scheduler').removeClass('d-none');

            scheduler.create();
            break;
    }
}

//--------------------------------
// 検索API呼び出し
//--------------------------------
function search(pageNumber) {
    // 検索条件取得
    conditions = $.fn.getDataFromForm('.search form');
    conditions['limit'] = ITEMS_ON_PAGE;
    conditions['page'] = pageNumber;

    $.ajax({
        dataType: 'json',
        url: SEARCH_URL,
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
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

/**
 * 削除の処理
 * @function deletePerformance
 * @returns {void}
 */
function deletePerformance() {
    var modal = $('#editModal');
    var theater = $('.search select[name="theater"]').val();
    var performance = modal.find('input[name=performance]').val();
    if (performance === '') {
        alert('情報が足りません');
        return;
    }
    $.ajax({
        dataType: 'json',
        url: '/events/screeningEvent/' + performance + '/cancel',
        type: 'PUT',
    }).done(function (data) {
        if (!data.error) {
            modal.modal('hide');
            searchSchedule();
            return;
        }
        alert('削除に失敗しました');
    }).fail(function (jqxhr, textStatus, error) {
        console.error(jqxhr, textStatus, error);
        alert('削除に失敗しました');
    });
}

/**
 * モーダル初期化
 */
function modalInit(theater, date, ticketGroups) {
    var ticketGroupDom = [];
    ticketGroupDom.push('<option value="">券種グループを選択</option>');
    for (var i = 0; i < ticketGroups.length; i++) {
        var ticketGroup = ticketGroups[i];
        ticketGroupDom.push('<option value="' + ticketGroup._id + '">' + ticketGroup.name.ja + '</option>')
    }

    var newModal = $('#newModal');
    newModal.find('.theater span').text($('.search select[name=theater] option[value=' + theater + ']').text());
    newModal.find('.day span').text(moment(date).format('YYYY年MM月DD日(ddd)'));
    newModal.find('input[name=theater]').val(theater);
    newModal.find('input[name=day]').val(date);
    newModal.find('select[name=ticketTypeGroup]').html(ticketGroupDom.join('\n'));

    var editModal = $('#editModal');
    editModal.find('.theater span').text($('.search select[name=theater] option[value=' + theater + ']').text());
    editModal.find('.theater input').val($('.search select[name=theater] option[value=' + theater + ']').text());
    editModal.find('select[name=ticketTypeGroup]').html(ticketGroupDom.join('\n'));
}

/**
 * 新規作成
 * @function add
 * @returns {void}
 */
function add() {
    var modal = $('#newModal');
    modal.find('select[name=theater]').val('');
    modal.find('input[name=weekDay]').prop('checked', true);
    modal.find('select[name=screeningEventSeriesId]')
        .html('<option selected disabled>劇場を選択してください</option>');
    modal.find('select[name=screen]')
        .html('<option selected disabled>劇場を選択してください</option>');
    modal.find('input[name=doorTime]').val('');
    modal.find('input[name=startTime]').val('');
    modal.find('input[name=endTime]').val('');
    modal.find('select[name=endDayRelative]').val('0');
    modal.find('input[name=mvtkExcludeFlg]').removeAttr('checked');
    modal.find('select[name=ticketTypeGroup]').val('');
    modal.find('input[name=onlineDisplayStartDateRelative]').val('');
    modal.find('input[name=onlineDisplayStartDateAbsolute]').datepicker('update', '');
    modal.find('input[name=onlineDisplayStartDate]').datepicker('update', '');
    modal.find('input[name=maxSeatNumber]').val('');

    modal.find('input[name=screeningDateStart]').datepicker('update', new Date());
    modal.find('input[name=screeningDateThrough]').datepicker('update', new Date());

    modal.find('.mvtk').show();

    $('#newModal').modal();
}

/**
 * スケジューラー生成
 */
function createScheduler() {
    return new Vue({
        el: '#scheduler',
        data: {
            editingPerforamce: undefined,
            HOUR_HEIGHT: 40,
            SCREEN_WIDTH: 60,
            TIME_WIDTH: 50,
            moment: moment,
            searchCondition: {},
            scheduleData: {
                dates: []
            },
            times: []
        },
        methods: {
            /**
             * 座席指定判定
             */
            isReservedSeatsAvailable: function (performance) {
                return !(performance.offers
                    && performance.offers.itemOffered.serviceOutput !== undefined
                    && performance.offers.itemOffered.serviceOutput.reservedTicket !== undefined
                    && performance.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat === undefined);
            },
            /**
             * ムビチケ対応判定
             */
            isSupportMovieTicket: function (performance) {
                return (performance.offers !== undefined
                    && Array.isArray(performance.offers.acceptedPaymentMethod)
                    && performance.offers.acceptedPaymentMethod.indexOf('MovieTicket') < 0);
            },
            /**
             * 追加特性取得performance.superEvent.additionalProperty
             */
            getAdditionalProperty: function (additionalPropertys, name) {
                if (additionalPropertys === undefined) {
                    return null;
                }
                var findResult = additionalPropertys.find(function (additionalProperty) {
                    return (additionalProperty.name === name);
                });
                if (findResult === undefined) {
                    return null;
                }
                return findResult.value;
            },
            /**
             * スケジューラー生成
             */
            create: function () {
                this.createTimes();
                this.searchCondition = this.getSearchCondition();
                console.log('this.searchCondition:', this.searchCondition);
                if (this.searchCondition.theater === ''
                    || this.searchCondition.date === '') {
                    alert('劇場、上映日を選択してください');
                    return;
                }
                var _this = this;

                this.searchScreeningEvent()
                    .then(function (data) {
                        modalInit(_this.getSearchCondition().theater, _this.getSearchCondition().date, data.ticketGroups);
                        _this.createScheduleData(data);
                    })
                    .catch(function (error) {
                        alert('検索できませんでした');
                    });
            },
            /**
             * 検索条件取得
             */
            getSearchCondition: function () {
                return {
                    theater: $('.search select[name=theater]').val(),
                    date: $('.search input[name=date]').val(),
                    format: $('.search select[name=format]').val(),
                    screen: ($('.search select[name=screen]').val() === '') ? undefined : $('.search select[name=screen]').val(),
                    onlyReservedSeatsAvailable: $('.search input[name=onlyReservedSeatsAvailable]:checked').val()
                };
            },
            /**
             * スケジュール情報検索API
             */
            searchScreeningEvent: function () {
                var options = {
                    dataType: 'json',
                    url: SEARCH_URL,
                    type: 'GET',
                    data: this.searchCondition,
                    beforeSend: function () {
                        $('#loadingModal').modal({ backdrop: 'static' });
                    }
                };
                return $.ajax(options)
                    .always(function () {
                        $('#loadingModal').modal('hide');
                    });
            },
            /**
             * スケジュールデータ作成
             */
            createScheduleData: function (data) {
                this.scheduleData.dates = [];
                for (var i = 0; i < Number(this.searchCondition.format); i++) {
                    var date = moment(this.searchCondition.date)
                        .add(i, 'days')
                        .toISOString();
                    this.scheduleData.dates.push({
                        data: date,
                        screens: data.screens.map(function (s) {
                            return {
                                data: s,
                                performances: data.performances.filter(function (p) {
                                    var expectedDate = moment(date)
                                        .tz('Asia/Tokyo')
                                        .format('YYYYMMDD');
                                    var isDateMatched = moment(p.startDate).tz('Asia/Tokyo').format('YYYYMMDD') === expectedDate
                                        || moment(p.endDate).tz('Asia/Tokyo').format('YYYYMMDD') === expectedDate;
                                    var isLocationMatched = p.location.branchCode === s.branchCode;

                                    // 同一スクリーンかつ同一日時に上映しているか
                                    return isLocationMatched && isDateMatched;
                                })
                            };
                        })
                    });
                }
            },
            /**
             * 時間データ生成
             */
            createTimes: function () {
                this.times = [];
                for (var i = 0; i < 24; i++) {
                    this.times.push(`0${i}`.slice(-2) + ':00');
                }
            },
            /**
             * パフォーマンスの表示位置取得
             */
            getPerformanceStyle: function (performance, date) {
                var viewDate = {
                    day: moment(date.data).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(date.data).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(date.data).tz('Asia/Tokyo').format('mm')
                }
                var start = {
                    day: moment(performance.doorTime).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(performance.doorTime).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(performance.doorTime).tz('Asia/Tokyo').format('mm')
                };
                var end = {
                    day: moment(performance.endDate).tz('Asia/Tokyo').format('YYYYMMDD'),
                    hour: moment(performance.endDate).tz('Asia/Tokyo').format('HH'),
                    minutes: moment(performance.endDate).tz('Asia/Tokyo').format('mm')
                };

                var hour = 60;
                var top = (start.hour * this.HOUR_HEIGHT) + (start.minutes * this.HOUR_HEIGHT / hour);
                var left = 0;
                var borderRadius = '6px';

                var height = ((end.hour - start.hour) * this.HOUR_HEIGHT) + ((end.minutes - start.minutes) * this.HOUR_HEIGHT / hour);
                // 日本時間で日またぎの場合（当日表示）
                if (Number(end.day) > Number(start.day) && Number(start.day) === Number(viewDate.day)) {
                    height = ((24 - start.hour) * this.HOUR_HEIGHT) + ((0 - start.minutes) * this.HOUR_HEIGHT / hour);
                    borderRadius = '6px 6px 0px 0px';
                }
                // 日本時間で日またぎの場合（翌日表示）
                if (Number(end.day) > Number(start.day) && Number(end.day) === Number(viewDate.day)) {
                    top = 0;
                    height = ((end.hour - 0) * this.HOUR_HEIGHT) + ((end.minutes - 0) * this.HOUR_HEIGHT / hour);
                    borderRadius = '0px 0px 6px 6px';
                }

                return {
                    parent: {
                        top: top + 'px',
                        left: left + 'px',
                        height: height + 'px',
                    },
                    child: {
                        backgroundColor: this.getAdditionalProperty(performance.superEvent.additionalProperty, 'color'),
                        borderRadius: borderRadius
                    }
                };
            },
            /**
             * 時間重複数取得
             */
            getOverlapPerformanceCount: function (targetPerformance, performances) {
                var doorTime = moment(targetPerformance.doorTime).unix();
                var endDate = moment(targetPerformance.endDate).unix();
                var filterResult = performances.filter(function (p) {
                    return ((moment(p.doorTime).unix() < doorTime && moment(p.endDate).unix() > doorTime)
                        || (moment(p.doorTime).unix() < endDate && moment(p.endDate).unix() > endDate));
                });
                return filterResult.length;
            },
            /**
             * パフォーマンス編集
             */
            editPerformance: function (performance) {
                this.editingPerforamce = performance;
                console.log('editing...', this.editingPerforamce);

                var fix = function (time) { return ('0' + (parseInt(time / 5) * 5)).slice(-2); };
                var day = moment(performance.startDate).tz('Asia/Tokyo').format('YYYYMMDD');

                var modal = $('#editModal');
                modal.find('.day span').text(moment(day).format('YYYY年MM月DD日(ddd)'));
                modal.find('.day input').val(moment(day).format('YYYY年MM月DD日(ddd)'));
                // チェックstartTime削除ボタン表示
                if (moment(day).isSameOrAfter(moment().tz('Asia/Tokyo'), 'day')) {
                    modal.find('.delete-button').show();
                } else {
                    modal.find('.delete-button').hide();
                }

                modal.find('input[name=performance]').val(performance.id);
                modal.find('input[name=theater]').val(performance.superEvent.location.id);
                modal.find('input[name=day]').val(day);
                modal.find('input[name=screeningEventId]').val(performance.superEvent.id);
                modal.find('input[name=mvtkExcludeFlg]').prop('checked', this.isSupportMovieTicket(performance));
                modal.find('input[name=reservedSeatsAvailableDisabled]').prop('checked', this.isReservedSeatsAvailable(performance));
                modal.find('input[name=reservedSeatsAvailable]').val((this.isReservedSeatsAvailable(performance)) ? '1' : '0');
                modal.find('input[name=maxSeatNumber]').val((performance.offers !== undefined) ? performance.offers.eligibleQuantity.maxValue : '');
                modal.find('.film span').text(performance.name.ja);
                modal.find('.film input').val(performance.name.ja);

                // 上映時間
                var doorTime = moment(performance.doorTime).tz('Asia/Tokyo').format('HH:mm');
                var startTime = moment(performance.startDate).tz('Asia/Tokyo').format('HH:mm');
                var endDay = moment(performance.endDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
                var endTime = moment(performance.endDate).tz('Asia/Tokyo').format('HH:mm');
                modal.find('input[name=doorTime]').val(doorTime);
                modal.find('input[name=startTime]').val(startTime);
                modal.find('input[name=endTime]').val(endTime);
                modal.find('input[name=endDay]').datepicker('update', endDay);
                modal.find('select[name=screen]').val(performance.location.branchCode);
                modal.find('select[name=ticketTypeGroup]').val(performance.offers.id);

                // 販売開始日
                var saleStartDate = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validFrom).tz('Asia/Tokyo').format('YYYY/MM/DD');
                var saleStartTime = (performance.offers === undefined)
                    ? '' : moment(performance.offers.validFrom).tz('Asia/Tokyo').format('HH:mm');
                if (saleStartDate !== '' && saleStartTime !== '') {
                    modal.find('input[name=saleStartDate]').datepicker('update', saleStartDate);
                    modal.find('input[name=saleStartTime]').val(saleStartTime);
                } else {
                    modal.find('input[name=saleStartDate]').val('');
                    modal.find('input[name=saleStartTime]').val('');
                }
                // オンライン表示
                var onlineDisplayStartDate = (performance.offers)
                    ? moment(performance.offers.availabilityStarts).tz('Asia/Tokyo').format('YYYY/MM/DD') : '';
                if (onlineDisplayStartDate !== '') {
                    modal.find('input[name=onlineDisplayStartDate]').datepicker('update', onlineDisplayStartDate);
                } else {
                    modal.find('input[name=onlineDisplayStartDate]').val('');
                }

                // 追加特性(フォームを初期化してからイベントの値をセット)
                for (let i = 0; i < 10; i++) {
                    modal.find('input[name="additionalProperty[' + i + '][name]"]').val('');
                    modal.find('input[name="additionalProperty[' + i + '][value]"]').val('');
                }
                var additionalProperty = (Array.isArray(performance.additionalProperty)) ? performance.additionalProperty : [];
                additionalProperty.forEach(function (property, index) {
                    modal.find('input[name="additionalProperty[' + index + '][name]"]').val(property.name);
                    modal.find('input[name="additionalProperty[' + index + '][value]"]').val(property.value);
                });

                modal.modal();
            }
        }
    });
}

/**
 * 入力方法切り替え(絶対・相対)
 */
function changeInputType() {
    var inputType = $(this).val();
    var parent = $(this).parents('.form-group');
    parent.find('.input-type').addClass('d-none');
    parent.find('.input-type[data-input-type=' + inputType + ']').removeClass('d-none');
}

function showOffers(id) {
    $.ajax({
        dataType: 'json',
        url: '/events/screeningEvent/' + id + '/offers',
        cache: false,
        type: 'GET',
        data: {},
        beforeSend: function () {
            $('#loadingModal').modal({ backdrop: 'static' });
        }
    }).done(function (data) {
        console.log(data);
        var modal = $('#modal-event');

        var thead = $('<thead>').addClass('text-primary')
            .append([
                $('<tr>').append([
                    $('<th>').text('ID'),
                    $('<th>').text('名称')
                ])
            ]);
        var tbody = $('<tbody>')
            .append(data.map(function (result) {
                var url = '/ticketTypes/' + result.id + '/update';

                return $('<tr>').append([
                    $('<td>').html('<a target="_blank" href="' + url + '">' + result.id + ' <i class="material-icons" style="font-size: 1.2em;">open_in_new</i></a>'),
                    $('<td>').text(result.name.ja)
                ]);
            }))
        var table = $('<table>').addClass('table table-sm')
            .append([thead, tbody]);

        var div = $('<div>').addClass('table-responsive')
            .append(table);

        modal.find('.modal-title').text('イベントオファー');
        modal.find('.modal-body').html(div);
        modal.modal();
    }).fail(function (jqxhr, textStatus, error) {
        alert('検索できませんでした');
    }).always(function (data) {
        $('#loadingModal').modal('hide');
    });
}

function editPerformance(id) {
    var event = $.CommonMasterList.getDatas().find(function (data) {
        return data.id === id
    });
    if (event === undefined) {
        alert('イベント' + id + 'が見つかりません');

        return;
    }

    // 編集モーダルオープン
    scheduler.editPerformance(event);
}