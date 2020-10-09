#include <node.h>
#include <node_buffer.h>
#include <sstream>
#include "../sdk/public/steam/steam_api.h"
#include "../sdk/public/steam/isteamgamecoordinator.h"

namespace Steam
{
	void Init(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		bool result = SteamAPI_Init();
		args.GetReturnValue().Set(result);
	}

	void Shutdown(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		SteamAPI_Shutdown();
	}

	void GetSteamID(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		CSteamID sid = SteamUser()->GetSteamID();
		uint64 id64 = sid.ConvertToUint64();

		std::stringstream ss;
		ss << id64;

		v8::Isolate *isolate = args.GetIsolate();
		v8::Local<v8::String> str = v8::String::NewFromUtf8(isolate, ss.str().c_str()).ToLocalChecked();
		args.GetReturnValue().Set(str);
	}

	void SetRichPresence(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		if (args.Length() < 2)
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
			return;
		}

		if (!args[0]->IsString())
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Expected string as first argument").ToLocalChecked()));
			return;
		}

		if (!args[1]->IsString())
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Expected string as second argument").ToLocalChecked()));
			return;
		}

		v8::Isolate *isolate = args.GetIsolate();
		v8::Local<v8::Context> context = isolate->GetCurrentContext();

		v8::Local<v8::String> pchKey = args[0]->ToString(context).ToLocalChecked();
		v8::Local<v8::String> pchValue = args[1]->ToString(context).ToLocalChecked();

		bool result = SteamFriends()->SetRichPresence((const char *)*pchKey, (const char *)*pchValue);
		args.GetReturnValue().Set(result);
	}

	void IsMessageAvailable(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		ISteamGameCoordinator *pGC = (ISteamGameCoordinator *)SteamClient()->GetISteamGenericInterface(SteamAPI_GetHSteamUser(), SteamAPI_GetHSteamPipe(), STEAMGAMECOORDINATOR_INTERFACE_VERSION);
		if (pGC == NULL)
		{
			args.GetReturnValue().Set(-1);
			return;
		}

		uint32 pcubMsgSize;
		if (pGC->IsMessageAvailable(&pcubMsgSize))
		{
			args.GetReturnValue().Set(pcubMsgSize);
		}
		else
		{
			args.GetReturnValue().Set(0);
		}
	}

	void RetrieveMessage(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		if (args.Length() < 1)
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
			return;
		}

		if (!args[0]->IsNumber())
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Expected number as first argument").ToLocalChecked()));
			return;
		}

		ISteamGameCoordinator *pGC = (ISteamGameCoordinator *)SteamClient()->GetISteamGenericInterface(SteamAPI_GetHSteamUser(), SteamAPI_GetHSteamPipe(), STEAMGAMECOORDINATOR_INTERFACE_VERSION);
		if (pGC == NULL)
		{
			v8::Isolate *isolate = args.GetIsolate();
			v8::Local<v8::Object> obj = v8::Object::New(isolate);
			args.GetReturnValue().Set(obj);
			return;
		}

		uint32 cubDest = args[0].As<v8::Number>()->Value();

		uint32 punMsgType;
		void *pubDest = malloc(cubDest);
		uint32 pcubMsgSize;
		EGCResults result = pGC->RetrieveMessage(&punMsgType, pubDest, cubDest, &pcubMsgSize);

		v8::Isolate *isolate = args.GetIsolate();
		v8::Local<v8::Context> context = isolate->GetCurrentContext();

		v8::Local<v8::Object> obj = v8::Object::New(isolate);
		obj->Set(context, v8::String::NewFromUtf8(isolate, "result").ToLocalChecked(), v8::Number::New(isolate, result));

		if (result != EGCResults::k_EGCResultOK)
		{
			free(pubDest);
			args.GetReturnValue().Set(obj);
			return;
		}

		obj->Set(context, v8::String::NewFromUtf8(isolate, "result").ToLocalChecked(), v8::Number::New(isolate, result));
		obj->Set(context, v8::String::NewFromUtf8(isolate, "msgType").ToLocalChecked(), v8::Number::New(isolate, punMsgType));
		obj->Set(context, v8::String::NewFromUtf8(isolate, "buffer").ToLocalChecked(), node::Buffer::Copy(isolate, (const char *)pubDest, pcubMsgSize).ToLocalChecked());

		free(pubDest);
		args.GetReturnValue().Set(obj);
	}

	void SendMessage(const v8::FunctionCallbackInfo<v8::Value> &args)
	{
		if (args.Length() < 2)
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
			return;
		}

		if (!args[0]->IsNumber())
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Expected number as first argument").ToLocalChecked()));
			return;
		}

		if (!args[1]->IsObject())
		{
			v8::Isolate *isolate = args.GetIsolate();
			isolate->ThrowException(v8::Exception::TypeError(v8::String::NewFromUtf8(isolate, "Expected buffer as second argument").ToLocalChecked()));
			return;
		}

		ISteamGameCoordinator *pGC = (ISteamGameCoordinator *)SteamClient()->GetISteamGenericInterface(SteamAPI_GetHSteamUser(), SteamAPI_GetHSteamPipe(), STEAMGAMECOORDINATOR_INTERFACE_VERSION);
		if (pGC == NULL)
		{
			args.GetReturnValue().Set(-1);
			return;
		}

		v8::Isolate *isolate = args.GetIsolate();
		v8::Local<v8::Context> context = isolate->GetCurrentContext();

		uint32 cubDest = args[0].As<v8::Number>()->Value();
		char *pubData = node::Buffer::Data(args[1]->ToObject(context).ToLocalChecked());
		uint32 cubData = node::Buffer::Length(args[1]->ToObject(context).ToLocalChecked());

		EGCResults result = pGC->SendMessage(cubDest, (void *)pubData, cubData);
		args.GetReturnValue().Set(result);
	}

	void Initialize(v8::Local<v8::Object> exports)
	{
		NODE_SET_METHOD(exports, "Init", Init);
		NODE_SET_METHOD(exports, "Shutdown", Shutdown);
		NODE_SET_METHOD(exports, "GetSteamID", GetSteamID);
		NODE_SET_METHOD(exports, "SetRichPresence", SetRichPresence);
		NODE_SET_METHOD(exports, "IsMessageAvailable", IsMessageAvailable);
		NODE_SET_METHOD(exports, "RetrieveMessage", RetrieveMessage);
		NODE_SET_METHOD(exports, "SendMessage", SendMessage);
	}

	NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);
} // namespace Steam
