angular.module("walkExamples", [], function(){

})

.controller("mainController", function($scope){

    var init = function(){
        $scope.state = 'tree';
    }

    init();
})