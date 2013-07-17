var dbShell;
var scanned = false;
var glbOpt = 0;

document.addEventListener("deviceready", onDeviceReady, false);

var scanCode = function() {
	window.plugins.barcodeScanner.scan(function(result) {
		alert("No Rekening : " + result.text);
		scanned = true;
		//ACCTNO INT(10)," + "CUSTNAME VARCHAR(10)
		//IMPORTANT : SCANNED TEXT CANNOT HAVE SPACES (i.e. acctNo must be a full 10 integer)
		loadPage("index.html?txt=" + result.text);	//must go home load all the stuff then redirect
	}, function(error) {
		alert("Gagal : " + error);
		loadPage("index.html");
	});
};

var encodeText = function(s) {
	window.plugins.barcodeScanner.encode(BarcodeScanner.Encode.TEXT_TYPE,
		s, function(success) {
			alert("Encode success: " + success);
		}, function(fail) {
			alert("Encoding failed: " + fail);
		});
};

function switchFields() {
	$("#inputTransForm :input").attr("disabled", false);
};

function exitApp() {
	navigator.app.exitApp();
}

function loadPage(s){
    $.mobile.changePage(s, {
        allowSamePageTransition: true,
        transition: 'none',
        reloadPage: true
    });
}

function doLog(s) {
	setTimeout(function() {
		console.log(s);
	}, 1000);
}

function dbErrorHandler(err) {
	alert("ABORT ERROR : " + err.message + "\nCode=" + err.code);
	loadPage("index.html");
}

function dbSuccessHandler() {
	doLog("Transaction Succesful");
}

function onDeviceReady() {
//	document.getElementById("devready").innerHTML = "OnDeviceReady fired.";

	dbShell = window.openDatabase("BankDB", "1.0", "BankDB", 200000);
	doLog("DB OPENED");
	dbShell.transaction(setupTable, dbErrorHandler, dbSuccessHandler);
	doLog("RAN TABLE SETUP");
}

function setupTable(tx) {
	doLog("setting up table...");
	tx.executeSql("CREATE TABLE IF NOT EXISTS MSF900"
			+ "(TRANSNO INTEGER PRIMARY KEY AUTOINCREMENT," + "TRANSDATE DATE,"
			+ "ACCTNO INT(10)," + "CUSTNAME VARCHAR(10)," + "TRANSAMT REAL(10))");
	loadPage("index.html");
}

// --------------------updates--------------------//
function insertTrans(trans) {
	doLog("insert trans");
	dbShell.transaction(function(tx) {
		tx.executeSql("INSERT INTO MSF900 (TRANSDATE,ACCTNO,CUSTNAME,TRANSAMT) values(?,?,?,?)", 
						[trans.date, trans.acct, trans.name, trans.amt ]);
	}, dbErrorHandler, function(){
        alert("Data Tersimpan");
    });
}

function updateTrans(trans) {
	doLog("update trans");
	dbShell.transaction(function(tx) {
		tx.executeSql("UPDATE MSF900 SET TRANSDATE=?,ACCTNO=?,CUSTNAME=?,TRANSAMT=? WHERE TRANSNO=?", 
				[trans.date, trans.acct, trans.name, trans.amt, trans.no ]);
	}, dbErrorHandler, function(){
        alert("Data Terupdate");
    });
};

function deleteTrans() {
	doLog("delete trans");
    var transNo = $.url($.mobile.activePage.data('url')).param('transNo');
    var del = confirm("Really?");
    if (del == true){
        dbShell.transaction(function(tx) {
            tx.executeSql("DELETE FROM MSF900 WHERE TRANSNO=?",[transNo]);
        }, dbErrorHandler, function(){
            alert("Data Terhapus");
            parent.history.back();
        });
    }
};

// ----------------handle entries-----------------//
function getTransList() {
	doLog("GETTING TRANS LIST");
	dbShell.transaction(function(tx) {
		tx.executeSql("SELECT * FROM MSF900 ORDER BY TRANSNO", [],
				renderTransList, dbErrorHandler);
	}, dbErrorHandler, dbSuccessHandler);
}

function getTransDetails() {
	var transNo = $.url($.mobile.activePage.data('url')).param('transNo');
	dbShell.transaction(function(tx) {
		tx.executeSql("SELECT * FROM MSF900 WHERE TRANSNO=?", [ transNo ],
				renderTransDetails, dbErrorHandler);
	}, dbErrorHandler, dbSuccessHandler);
}

function renderTransList(tx, result) {
	doLog("RENDERING TRANS LIST...");
	$('#transList').empty();
	if (result.rows.length == 0) {
		$("#subHeader").html("<p>Transaksi Kosong.</p>");
	} else {
		$("#subHeader").html("<p>Transaksi</p>");
		var list = "";
		$.each(result.rows, function(index) {
			var row = result.rows.item(index);
			list += "<li><a href='trans_details.html?transNo="+ row['TRANSNO'] + "'>"
				  + $.format.date(row['TRANSDATE'], 'dd/M/yyyy') + " " + row['CUSTNAME'] + " " + row['TRANSAMT'] + "</a></li>";
		});
		$('#transList').html(list);
		$('#transList').listview();
	}
}

function renderTransDetails(tx, result) {
	doLog("RENDERING TRANS DETAILS");
	if (result.rows.length != 1) {
		alert("Incorrect Data Returned");
		loadPage("index.html");
	} else {
		var row = result.rows.item(0);
		$('#detDate').val($.format.date(row['TRANSDATE'], 'dd/M/yyyy'));
		$('#detActNo').val(row['ACCTNO']);
		$('#detName').val(row['CUSTNAME']);
		$('#detAmt').val(row['TRANSAMT']);
	}
}

//----------------------Handle Pages----------------------//

$('#home').live("pageshow", function(e) {
	var text = $.url($.mobile.activePage.data('url')).param('txt');
	if (scanned){
		alert("trans_input.html?opt="+glbOpt+"&txt="+text);
		loadPage("trans_input.html?opt="+glbOpt+"&txt="+text);
	}
});

$('#trans_list').live("pageshow", function(e) {
	getTransList();
	e.preventDefault();
});

//-------------------2 modes pos/neg----------------------//

$('#trans_option').live("pageshow", function(e) {
	glbOpt = $.url($.mobile.activePage.data('url')).param('opt');
	if (glbOpt == 1) {
		$('#hdrTranOpt').text("Setor Tunai");
	}else {
		$('#hdrTranOpt').text("Tarik Tunai");
	}
	$('#btnTransOpt').attr({
		href : "trans_input.html?opt=" + glbOpt
	});
});

$('#trans_input').live("pageshow", function(e) {
	var option = $.url($.mobile.activePage.data('url')).param('opt');	
	if (option == 1) {
		$('#lblInpAmt').html("Jumlah Setoran");
	}else {
		$('#lblInpAmt').html("Jumlah Tarikan");
	}
	if (scanned) {
		scanned = false;
		var accNo = $.url($.mobile.activePage.data('url')).param('txt').substring(0,10);
		var accName = $.url($.mobile.activePage.data('url')).param('txt').substring(10);
		$('#inpActNo').val(accNo);
		$('#inpName').val(accName);
	}
	e.preventDefault();
});

$('#inputTransForm').live("submit", function(e) {
	var option = $.url($.mobile.activePage.data('url')).param('opt');
	var trans = {
		no   : 0,
		date : new Date(),
		acct : $('#inpActNo').val(),
		name : $('#inpName').val(),
		amt  : $('#inpAmt').val()
	};
	if (option == 2) {
		trans.amt = trans.amt * -1;
	};
	insertTrans(trans);
});

//-------------------2 modes enable/disable---------------------//
$('#trans_details').live("pageshow", function(e) {
	getTransDetails();
	e.preventDefault();
});

$('#detTransForm').live("submit", function(e) {
	var trans = {
		no   : $.url($.mobile.activePage.data('url')).param('transNo'),
		date : $('#detDate').val(),
		acct : $('#detActNo').val(),
		name : $('#detName').val(),
		amt  : $('#detAmt').val()
	};
	updateTrans(trans);
});

