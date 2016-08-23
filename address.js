/**
 * Created by Naver on 2016. 8. 22..
 */
var baseAddressNumberRegex = /([가-힣]+(시|군|구)\s)?[가-힣]+[1-9]?(읍|면|동|가)(\s[가-힣]+[1-9]?리)?/g;
var getUniqueBaseAddressNumberResult = function (text) {
    var baseResult = text.match(baseAddressNumberRegex);
    if (baseResult === null || baseResult.length == 0) {
        return new Array();
    }

    var uniqueBaseResult = baseResult.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    });

    return uniqueBaseResult;
}

var getAddressNumberResult = function (text) {
    var addressNumberRegex = /([가-힣]+(시|도)\s)?([가-힣]+시\s)?([가-힣]+(시|군|구)\s)?[가-힣]+[1-9]?(읍|면|동|가)(\s[가-힣]+[1-9]?리)?(\s[가-힣]+(빌(라?)|아파트|\s아파트))?(\s[0-9]+\-[0-9]+)?((\s[0-9A-Za-z가-힣]+(동|층|호))+)?/g;
    var addressResult = text.match(addressNumberRegex);

    return addressResult;
}

var getAddressStreetResult = function (text) {
    var addressStreetRegex = /([가-힣]+도\s)?([가-힣]+시\s)?([가-힣]+(시|군|구)\s)([가-힣]+(읍|면)\s)?[가-힣]+([1-9]+)?(로|가(길)?|길|번길|리)(\s[0-9]+번가길)?(\s지하([1-9]+호)?)?(\s[0-9]+(\-[0-9]+)?)?(,(\s[가-힣0-9A-Za-z]+(동|층|호))+)?(\s[가-힣]+)?(\s[(]+[가-힣\s]+(,\s)?([가-힣\s]+)?[)])?/g;
    var addressResult = text.match(addressStreetRegex);

    return addressResult;
}

var getAddressNumberResultAfterRemoveInvalidation = function (text) {
    var uniqueBaseResult = getUniqueBaseAddressNumberResult(text);
    var totalResult = getAddressNumberResult(text);

    var finalResult = new Array();
    for (var index in totalResult) {
        var value = totalResult[index];
        if (uniqueBaseResult.indexOf(value) < 0) {
            finalResult.push(value);
        }
    }

    return finalResult;
}

var createParsingRange = function(start, end, address) {
    return range = {
        'start': start,
        'end': end,
        'address': address
    }
}

var getAddressNumberParsingRange = function (text) {
    var addressNumberRange = new Array();

    var subStrStartIndex = 0;
    var addressNumberResult = getAddressNumberResultAfterRemoveInvalidation(text);

    for (var index in addressNumberResult) {
        var address = addressNumberResult[index];
        var startIndex = text.indexOf(address, subStrStartIndex);
        subStrStartIndex = startIndex + address.length;
        addressNumberRange.push(createParsingRange(startIndex, subStrStartIndex, address));
    }

    return addressNumberRange;
}

var getAddressStreetParsingRange = function (text) {
    var addressStreetRange = new Array();

    var subStrStartIndex = 0;
    var streetNumberResult = getAddressStreetResult(text);

    var baseUrl = "https://www.google.co.kr/maps/place/";

    for (var index in streetNumberResult) {
        var address = streetNumberResult[index];
        var startIndex = text.indexOf(address, subStrStartIndex);
        subStrStartIndex = startIndex + address.length;
        addressStreetRange.push(createParsingRange(startIndex, subStrStartIndex, address));
    }

    return addressStreetRange;
}

var convertToLinkedText = function (mergedRange, text) {

    var convertText = "";
    var subStrStartIndex = 0;

    var baseUrl = "https://www.google.co.kr/maps/place/";

    for (var index in mergedRange) {
        var addressRange = mergedRange[index];

        convertText += text.substring(subStrStartIndex, addressRange.start);
        convertText += "<a href='" + baseUrl + addressRange.address + "' target='_blank'>";
        convertText += addressRange.address;
        convertText += "</a>";

        subStrStartIndex = addressRange.end;
    }

    if (subStrStartIndex < text.length) {
        convertText += text.substring(subStrStartIndex, text.length);
    }

    return convertText;
}

var getMergedRange = function (srcArray, destArray) {
    var mergedRange = new Array();
    var remainsRange = new Array();

    // addressNumberRange 와 addressStreetRange를 Merge
    var cursorIndex = 0;
    for (var srcIndex in srcArray) {
        var srcRange = srcArray[srcIndex];

        if (destArray.length <= 0) {
            mergedRange.push(srcRange);
            continue;
        }

        var isIncludeSrc = false;

        for (var destIndex in destArray) {
            if (cursorIndex > 0 && cursorIndex > destIndex) {
                continue;
            }

            var destRange = destArray[destIndex];

            // 작다.
            if (destRange.start < srcRange.start && destRange.end < srcRange.end) {
                mergedRange.push(destRange);
                cursorIndex += 1;
            }
            // 우로 걸친다.
            else if (destRange.start < srcRange.start && (destRange.end > srcRange.start && destRange.end < srcRange.end)) {
                cursorIndex += 1;
                // 패스
            }
            // 우가 포함한다.
            else if (destRange.start < srcRange.start && destRange.end == srcRange.end) {
                mergedRange.push(destRange);
                isIncludeSrc = true;
                cursorIndex += 1;
            }
            // 같다.
            else if (destRange.start == srcRange.start && destRange.end == srcRange.end) {
                mergedRange.push(destRange);
                isIncludeSrc = true;
                cursorIndex += 1;
            }
            // 속한다.
            else if (destRange.start >= srcRange.start && destRange.end <= srcRange.end) {
                // 패스
                cursorIndex += 1;
            }
            // 좌로 걸친다.
            else if ((destRange.start > srcRange.start && destRange.start < srcRange.end) && destRange.end > srcRange.end) {
                // 패스
            }
            // 좌가 포함한다.
            else if (destRange.start == srcRange.start && destRange.end > srcRange.end) {
                mergedRange.push(destRange);
                isIncludeSrc = true;
                cursorIndex += 1;
            }
            // 모두 포함한다.
            else if (destRange.start < srcRange.start && destRange.end > srcRange.end) {
                mergedRange.push(destRange);
                isIncludeSrc = true;
                cursorIndex += 1;
            }
            // 범위를 벗어났다.
            else if (destRange.start > srcRange.end) {
                if (srcIndex == srcArray.length - 1) {
                    remainsRange.push(destRange);
                    cursorIndex += 1;
                    continue;

                } else {
                    break;
                }
            }
        }

        if (!isIncludeSrc) {
            mergedRange.push(srcRange);
        }
    }

    if (remainsRange.length > 0) {
        mergedRange = mergedRange.concat(remainsRange);
    }

    return mergedRange;
}

window.onload = function() {
    var resetButton = document.getElementById("btn_reset")
    var convertButton = document.getElementById("btn_convert");

    var originalTextArea = document.getElementById("original_textarea");
    var convertResultDiv = document.getElementById("convert_result_div");

    resetButton.onclick = function () {
        originalTextArea.value = "";
        convertResultDiv.innerHTML = "";
    };

    convertButton.onclick = function () {
        var targetText = originalTextArea.value;

        var addressStreetRange = getAddressStreetParsingRange(targetText);
        var addressNumberRange = getAddressNumberParsingRange(targetText);

        console.log(addressStreetRange);
        console.log(addressNumberRange);

        var mergedRange;
        if (addressStreetRange.length > 0) {
            mergedRange = getMergedRange(addressStreetRange, addressNumberRange);
        } else if (addressNumberRange.length > 0) {
            mergedRange = getMergedRange(addressNumberRange, addressStreetRange);
        }

        console.log(mergedRange);

        convertResultDiv.innerHTML = convertToLinkedText(mergedRange, targetText);
    };
}