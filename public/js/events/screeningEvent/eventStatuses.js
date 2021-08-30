/* global moment, flatpickr */
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

var selectedEventIds = [];

$(function () {
    'use strict';

    // statusからCSSクラス名を得る
    var getClassNameByStatus = function (performance) {
        var className = '';
        if (performance.eventStatus === 'EventPostponed') {
            className += 'item-ev-slow ';
        } else if (performance.eventStatus === 'EventCancelled') {
            className += 'item-ev-stopped ';
        }

        if (performance.eventStatus === 'EventPostponed' || performance.eventStatus === 'EventCancelled') {
            className += 'item-supenpeded ';
        }
        className += 'item-hour-' + performance.hour;
        return className;
    };

    // 文字列整形用 (Stringのidx文字目にstrを差し込む)
    var spliceStr = function (targetStr, idx, str) {
        var ret = targetStr;
        try {
            ret = (targetStr.slice(0, idx) + str + targetStr.slice(idx));
        } catch (e) {
            console.log(e);
        }
        return ret || '';
    };


    // var sales_suspended = [];

    // APIから得たパフォーマンス一覧を整形して表示
    var dom_performances = document.querySelector('.performances');
    var showPerformances = function (performanceArray) {
        // 1hごとにまとめる (start_timeの最初2文字を時間とする)
        var hourArray = [];
        var performancesByHour = {};
        var performancesById = {};
        var moment_now = moment();
        performanceArray.forEach(function (performance) {
            try {
                var day = moment(performance.startDate)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD');
                var start_time = moment(performance.startDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm');
                var end_time = moment(performance.endDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm');

                var hour = start_time.slice(0, 2);
                // 終了後のperformanceは無視
                if (moment_now.isAfter(moment(day + '' + end_time, 'YYYYMMDDHHmm'))) {
                    return true;
                }
                if (!~hourArray.indexOf(hour)) {
                    hourArray.push(hour);
                    performancesByHour[hour] = [];
                }

                var tourNumber = '';
                if (Array.isArray(performance.additionalProperty)) {
                    var tourNumberProperty = performance.additionalProperty.find(function (p) {
                        return p.name === 'tourNumber';
                    });
                    if (tourNumberProperty !== undefined) {
                        tourNumber = tourNumberProperty.value;
                    }
                }
                performancesByHour[hour].push({
                    id: performance.id,
                    hour: hour,
                    start_time: start_time,
                    end_time: end_time,
                    seat_status: performance.remainingAttendeeCapacity,
                    eventStatus: performance.eventStatus,
                    tour_number: tourNumber
                });
                performancesById[performance.id] = performance;
            } catch (e) {
                console.log(e);
                return true;
            }
        });
        // 時間割を念のためソート
        hourArray.sort(function (a, b) {
            if (a < b) { return -1; }
            if (a > b) { return 1; }
            return 0;
        });

        // sales_suspended.forEach(function(suspension) {
        //     suspension.performance_ids.forEach(function(pId) {
        //         performancesById[pId].suspension_annnouce_locales = suspension.annnouce_locales;
        //     });
        // });

        var html = '';
        hourArray.forEach(function (hour) {
            // 時間割内のパフォーマンスを念のためソート
            performancesByHour[hour].sort(function (a, b) {
                if (a.start_time < b.start_time) { return -1; }
                if (a.start_time === b.start_time) { return 0; }
                return 1;
            });

            html += '<div class="performance">' +
                '<div class="hour"><label><span>' + hour + ':00～</span><input class="checkbox-hourtoggle" type="checkbox" data-hour="' + hour + '"> 時間帯選択</label></div>' +
                '<div class="items">';
            performancesByHour[hour].forEach(function (performance) {
                var suspensionStatusStr = '';

                if (performance.eventStatus === 'EventPostponed') {
                    suspensionStatusStr += '販売休止中';
                } else if (performance.eventStatus === 'EventCancelled') {
                    suspensionStatusStr += '販売中止中';
                }

                html += '<div class="item ' + getClassNameByStatus(performance) + '" data-performance-id="' + performance.id + '">' +
                    '<p class="time">' + spliceStr(performance.start_time, 2, ':') + ' - ' + spliceStr(performance.end_time, 2, ':') + '</p>' +
                    '<div class="wrapper-status">' +
                    '<div class="supensionstatus">' +
                    '<p class="status">' + performance.seat_status + '</p>' +
                    '<p>' + suspensionStatusStr + '</p>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>' +
                '</div>';
        });
        dom_performances.innerHTML = html;
    };

    // Hour単位のパフォーマンスtoggle
    $(document).on('change', '.checkbox-hourtoggle', function (e) {
        var hour = e.currentTarget.getAttribute('data-hour');
        if (e.currentTarget.checked) {
            $('.item-hour-' + hour).addClass('item-selected');
        } else {
            $('.item-hour-' + hour).removeClass('item-selected');
        }
    });

    // パフォーマンス決定
    $(document).on('click', '.item', function (e) {
        e.currentTarget.classList.toggle('item-selected');
        // document.querySelector('input[name="performanceId"]').value = e.currentTarget.getAttribute('data-performance-id');
        // document.getElementById('form_performanceId').submit();
    });

    // オンライン販売・EV運行対応モーダル呼び出し
    var bool_forResume = false;
    var $modal_suspension = $('#modal_suspension');
    var textarea_announcemail = document.getElementById('textarea_announcemail');

    // 販売停止ボタン
    document.getElementById('btn_callmodal_suspend').onclick = function () {
        var selectedEvents = getSelectedEvents();
        console.log(selectedEvents);

        bool_forResume = false;
        if (!valideteSelection()) { return false; }
        document.getElementById('radio_ev_slow').checked = true;
        $modal_suspension.removeClass('mode-resume mode-evstop').addClass('mode-suspend').modal();
    };

    // 販売再開ボタン
    document.getElementById('btn_callmodal_resume').onclick = function () {
        bool_forResume = true;
        if (!valideteSelection()) { return false; }
        document.getElementById('radio_ev_restart').checked = true;
        $modal_suspension.removeClass('mode-suspend mode-evstop').addClass('mode-resume').modal();
    };

    $('.radio-ev').change(function (e) {
        if (e.target.id === 'radio_ev_stop') {
            $modal_suspension.addClass('mode-evstop');
        } else {
            $modal_suspension.removeClass('mode-evstop');
        }
    });

    var busy_suspend = false;
    document.getElementById('btn_exec').onclick = function () {
        if (busy_suspend || !confirm('よろしいですか？')) { return false; }

        // 運行状況
        var evStatus = $('input[name="ev"]:checked').val();
        var notice = '';
        if (!bool_forResume && evStatus === 'EventCancelled') {
            notice = textarea_announcemail.value;
            if (!notice) {
                return alert('お客様への通知内容を入力してください');
            }
        }
        busy_suspend = true;
        console.log('selectedEventIds:', selectedEventIds);
        // if (selectedEventIds.length !== 1) {
        //     alert('イベントはひとつだけ選択してください');

        //     return;
        // }

        $.ajax({
            dataType: 'json',
            url: '/projects/' + PROJECT_ID + '/events/screeningEvent/updateStatuses',
            type: 'POST',
            data: {
                performanceIds: selectedEventIds,
                evStatus: evStatus,
                notice: notice
            },
            beforeSend: function () {
                $modal_suspension.modal('hide');
            }
        }).done(function () {
            alert('販売を' + ((!bool_forResume) ? '停止' : '再開') + 'しました');
        }).fail(function (jqxhr, textStatus, error) {
            if (jqxhr.status === 500) {
                alert('サーバエラーが発生しました');
            } else {
                alert('通信エラーが発生しました\n\n' + JSON.stringify(error));
            }
        }).always(function () {
            busy_suspend = false;
            searchSchedule();
            // search({
            //     page: 1,
            //     date: ymd
            // });
        });
    };
});

function getSelectedEvents() {
    var selectedEventsBoxes = $('input[name="selectedEvents"]:checked');

    var ids = [];
    selectedEventsBoxes.each(function () {
        ids.push($(this).val());
    });

    var selectedEvents = $.CommonMasterList.getDatas()
        .filter(function (data) {
            return ids.indexOf(data.id) >= 0;
            // }).filter(function (data) {
            //     return data.reservationStatus === 'ReservationConfirmed';
        });

    return selectedEvents;
}

var valideteSelection = function () {
    selectedEventIds = [];
    var selectedEvents = getSelectedEvents();
    // var selectedItems = document.getElementsByClassName('item-selected');
    if (!selectedEvents.length) {
        return alert('イベントを選択してください');
    }
    var valid = true;
    Array.prototype.forEach.call(selectedEvents, function (event) {
        // if (bool_forResume) {
        //     // 停止済み以外を再開しようとしていたら弾く
        //     if (dom_item.className.indexOf('item-supenpeded') === -1) {
        //         valid = false;
        //         return false;
        //     }
        //     // 停止済みを停止しようとしていたら弾く
        // } else if (dom_item.className.indexOf('item-supenpeded') !== -1) {
        //     valid = false;
        //     return false;
        // }
        selectedEventIds.push(event.id);
    });
    if (!valid) {
        alert((bool_forResume ? '販売再開ボタンは販売停止済みの' : '販売停止ボタンは販売中の') + '枠だけを選択して押してください。');
    }

    return valid;
};
