/**
 * @file 时段组件工具集
 * @author Brian Li
 * @author Han Bing Feng
 * @email lbxxlht@163.com
 * @version 0.0.2
 */

define(function (require) {
    // 168 = 7 x 24;
    var _ = require('underscore');
    var langTool = require('./language');

    // schedule一个格子的边长
    var CELL_LENGTH = 24;

    return {

        /**
         * 将string类型的value转换成日优先的二维数组。
         * value为选定的选定的时段值。
         * 是一个有7x24元素的数组JSON.stringify后的值。日优先存放一星期每天24小时的时段选择情况。
         * 每个元素可为null，或者一个string。
         * 当为null时，表示该时段没有被选择。
         * 当为string时，表示该时段被选择，string的内容为当前时段的label。
         * 相邻时段相同值的label会被合并。
         * 若label为空串（''），则显示默认label。默认为时段跨度。如1:00-2:00
         *
         * @param {string} value 字符串值
         * @return {Array}
         */
        parseValue: function (value) {
            var arrValue;
            try {
                arrValue = JSON.parse(value);
            }
            catch (e) {
                arrValue = [];
            }
            var result = [];
            var hourCount = 0;
            var arrDay;
            for (var i = 0; i < 168; i++) {
                if (hourCount === 0) {
                    arrDay = [];
                }
                hourCount++;
                arrDay.push(arrValue[i]);
                if (hourCount === 24) {
                    result.push(arrDay);
                    hourCount = 0;
                }
            }
            return result;
        },

        /**
         * 将value从原始格式转换成string
         *
         * @override
         *
         * @param {Array} rawValue 原始值
         * @return {string}
         */
        stringifyValue: function (rawValue) {
            if (!rawValue) {
                return '';
            }

            return JSON.stringify(_.flatten(rawValue));
        },

        selectedCount: function (value, axis1, axis2) {
            value = this.parseValue(value);
            var result = 0;
            for (var y = axis1.y; y < axis2.y + 1; y++) {
                if (y > value.length - 1) {
                    continue;
                }
                for (var x = axis1.x; x < axis2.x + 1; x++) {
                    if (x > value[y].length - 1) {
                        continue;
                    }
                    if (value[y][x] != null) {
                        result++;
                    }
                }
            }

            return result;
        },

        updateValueByAxis: function (value, axis1, axis2, v) {
            value = this.parseValue(value);
            for (var y = axis1.y; y < axis2.y + 1; y++) {
                if (y > value.length - 1) {
                    continue;
                }
                for (var x = axis1.x; x < axis2.x + 1; x++) {
                    if (x > value[y].length - 1) {
                        continue;
                    }
                    value[y][x] = v == null
                        ? (
                            value[y][x] == null ? '' : null
                        )
                        : v;
                }
            }
            return this.stringifyValue(value);
        },

        updateValueByMouse: function (value, state) {
            var scheduleRange = this.getScheduleRangeByMouse(state);
            return this.updateValueByAxis(value, {
                x: scheduleRange.startHour,
                y: scheduleRange.startWeekday
            }, {
                x: scheduleRange.endHour,
                y: scheduleRange.endWeekday
            });
        },

        /**
         * 根据schedule mouse state，计算所选的schedule区域。
         *
         * @param  {Object} state mouse state
         * @return {Object} schedule区域
         * @param {number} return.startHour 起始小时
         * @param {number} return.endHour 终止小时，包含
         * @param {number} return.startWeekday 起始星期
         * @param {number} return.endWeekday 终止星期，包含
         */
        getScheduleRangeByMouse: function (state) {
            var axis1 = this.gridAxis(
                Math.min(state.mouseDownX, state.mouseCurrentX),
                Math.min(state.mouseDownY, state.mouseCurrentY)
            );
            var axis2 = this.gridAxis(
                Math.max(state.mouseDownX, state.mouseCurrentX),
                Math.max(state.mouseDownY, state.mouseCurrentY)
            );
            return {
                startHour: axis1.x,
                endHour: axis2.x,
                startWeekday: axis1.y,
                endWeekday: axis2.y
            };
        },

        /**
         * 返回一个时间段的文字表示。
         * 若提供startHour，返回 startHour:00
         * 若提供startHour, endHour，返回startHour:00-(endHour+1):00
         * 若提供startHour, endHour, startWeekday，返回 星期x startHour:00-(endHour+1):00
         * 若提供startHour, endHour, startWeekday， endWeekday，返回 星期x-星期x，startHour:00-(endHour+1):00
         * 若startHour=0，endHour=23，返回 全天。
         *
         * @param  {number} startHour 开始小时数
         * @param  {number} endHour 结束小时数
         * @param  {number} startWeekday 起始星期数
         * @param  {number} endWeekday 终止星期数
         * @return {string} 文字表示
         */
        value2text: function (startHour, endHour, startWeekday, endWeekday) {
            var res = '';
            if (startHour == null) {
                return '';
            }

            if (startWeekday != null) {
                res = langTool.schedule.day[startWeekday] + ' ';
            }

            if (endWeekday != null) {
                res = res.replace(' ', '');
                res = res + ' - ' + langTool.schedule.day[endWeekday] + '，';
            }

            if (startHour === 0 && endHour === 23) {
                res = res + '全天';
                if (endWeekday == null) {
                    res = res.replace(' ', '');
                }

                return res;
            }

            res += startHour + ':00';
            if (endHour != null) {
                res += '-' + (endHour + 1) + ':00';
            }
            return res;
        },

        /**
         * 将数组形式的24小时值转换为一组label。数组每一位值表示当前小时的状态，
         * 相同状态的值将合并为一个label元素返回。每一个label元素为一个object。
         *
         * @param  {Array<string>} arr 数组形式的24小时值
         * @return {Object} label元素数组
         * @param {number} return.begin label的开始小时
         * @param {number} return.end label的结束小时
         * @param {string} return.value label上显示的值，默认为当前小时范围
         */
        value2label: function (arr) {
            var result = [];
            var beginIndex = 0;
            var prevValue = null;
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] == null) {
                    if (prevValue == null) {
                        continue;
                    }
                    else {
                        result.push({begin: beginIndex, end: i - 1, value: prevValue});
                        prevValue = null;
                        continue;
                    }
                }
                else {
                    if (_.isEqual(arr[i], prevValue)) {
                        continue;
                    }
                    else {
                        if (prevValue != null) {
                            result.push({begin: beginIndex, end: i - 1, value: prevValue});
                        }
                        beginIndex = i;
                        prevValue = arr[i];
                    }
                }
            }
            if (prevValue != null) {
                result.push({begin: beginIndex, end: 23, value: prevValue});
            }
            return result;
        },

        titleLayerSize: function (axis, hide) {
            var pos = {
                width: 100,
                height: 60,
                left: -200,
                top: -200
            };
            var padding = 10;
            var tWidth = 577;
            var tHeight = 170;
            if (hide) {
                return pos;
            }
            pos.top = ((axis.y + 1) * CELL_LENGTH + padding + pos.height < tHeight)
                ? ((axis.y + 1) * CELL_LENGTH + padding) : (axis.y * CELL_LENGTH - padding - pos.height);
            pos.left = (axis.x * CELL_LENGTH + pos.width < tWidth)
                ? (axis.x * CELL_LENGTH) : ((axis.x + 1) * CELL_LENGTH - pos.width);
            return pos;
        },

        gridAxis: function (x, y) {
            return {
                x: (x - x % CELL_LENGTH) / CELL_LENGTH,
                y: (y - y % CELL_LENGTH) / CELL_LENGTH
            };
        },

        cursorSize: function (state) {
            var pos = {
                left: -2,
                top: -2,
                width: 0,
                height: 0
            };
            if (state.mouseCurrentX < 0) {
                return pos;
            }
            else if (state.mouseDownX < 0) {
                var axis = this.gridAxis(state.mouseCurrentX, state.mouseCurrentY);
                pos.left = axis.x * CELL_LENGTH + 1;
                pos.top = axis.y * CELL_LENGTH + 1;
                pos.width = CELL_LENGTH - 1;
                pos.height = CELL_LENGTH - 1;
                return pos;
            }
            var axis1 = this.gridAxis(
                Math.min(state.mouseDownX, state.mouseCurrentX),
                Math.min(state.mouseDownY, state.mouseCurrentY)
            );
            var axis2 = this.gridAxis(
                Math.max(state.mouseDownX, state.mouseCurrentX),
                Math.max(state.mouseDownY, state.mouseCurrentY)
            );
            pos.left = axis1.x * CELL_LENGTH + 1;
            pos.top = axis1.y * CELL_LENGTH + 1;
            pos.width = (axis2.x - axis1.x + 1) * CELL_LENGTH - 1;
            pos.height = (axis2.y - axis1.y + 1) * CELL_LENGTH - 1;
            // color-blue-2
            pos.backgroundColor = 'rgba(47, 130, 245, 0.5)';
            return pos;
        }
    };

});